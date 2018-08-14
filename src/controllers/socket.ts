import { Socket, Server } from "socket.io";
import { fromEvent, Observable } from 'rxjs'
import { map, buffer, tap } from 'rxjs/operators';

import { RedisAsyncMethods } from "../socket";
import { RoomController } from "./room";
import { IDrawingController } from "./drawing";
import { PointsGroup } from '../models/drawingpoints'
import { Room } from "../models/room";

interface MessageObject {
    author: string;
    message: string;
}

interface RoomJoinData {
    roomId: string;
    drawingId: number;
}

interface RoomCreateData extends Room {
    drawingId: number;
}

export interface DrawingPointStream {
    x: number;
    y: number;
    fill: number;
    weight: number;
    drawingId: number
}

interface DrawResetData {
    userId: string;
    drawingId: number;
}

interface SetAdminData {
    roomId: string;
    userId: number;
}

export class SocketController {
    private roomId: string = '';

    constructor(
        private io: Server,
        private socket: Socket,
        private username: string,
        private userId: number,
        private roomController: RoomController,
        private drawingController: IDrawingController,
        private redis: RedisAsyncMethods
    ) { }

    onConnect = async () => {
        const [rooms, messages] = await Promise.all([
            this.getRooms(),
            this.getMessages('general/messages')
        ]);

        const currentlyOnline = Object.keys(this.io.sockets.connected)
            .reduce(this.reduceConnectedHelper, {});

        await this.redis.hmsetAsync('general/users', currentlyOnline);

        this.io.sockets.emit('rooms/get', rooms);
        this.io.sockets.emit('general/users', currentlyOnline);
        this.io.sockets.emit('general/messages', messages);
    }

    getRooms = async () => {
        const rooms = await this.roomController.getAll();
        return rooms.reduce(this.reduceRoomsHelper, {});
    }

    getMessages = async (roomId: string) => {
        const messagesExists = await this.redis.existsAsync(roomId);
        return !!messagesExists ? await this.redis.hgetallAsync(roomId) : {};
    }

    onGeneralMessageReceived = async (data: MessageObject) => {
        console.log('got a new general message');
        const { message, author } = data;

        const messages = await this.getMessages('general/messages');
        messages[Date.now()] = `${message}\n${author}`;

        await this.redis.hmsetAsync('general/messages', messages);
        this.io.sockets.emit('general/messages', messages);
    }

    onRoomMessage = async (data: MessageObject) => {
        console.log(`message posted in ${this.roomId}`);
        const { message, author } = data;

        const messages = await this.getMessages(this.roomId);
        messages[Date.now()] = `${message}\n${author}`;

        await this.redis.hmsetAsync(this.roomId, messages);
        this.io.to(this.roomId).emit(`${this.roomId}/messages`, messages);
    }

    onDrawMouseUp = async (clientDrawCount: number) => {
        //construct an array of drawing points
        // this.redis.std
        //     .batch(keysToResolve.map(key => ['hgetall', key]))
        //     .del(`${roomId}/drawCount`)
        //     .exec((err, replies) => {
        //         if (err) console.log('redis batch error');

        //         const drawingGroup = replies.slice(0, replies.length - 1);
        //         this.drawingController.savePointsGroup(drawingGroup);
        //         //remove from redis after db insertion
        //         keysToResolve.map((key) => this.redis.delAsync(key));
        //     });
    }

    onDrawChange = async (data: RoomJoinData) => {
        const { roomId, drawingId } = data;

        const existingDrawingPoints = await this.drawingController.getRoomDrawingPoints(drawingId);
        this.redis.setAsync(`${roomId}/drawingid`, drawingId);

        this.socket.broadcast.to(roomId).emit(`${roomId}/draw/change`, drawingId);
        this.io.to(roomId).emit(`${roomId}/draw/getexisting`, existingDrawingPoints);
    }

    onRoomJoin = async (data: RoomJoinData) => {
        const { userId } = this;
        const { roomId } = data;

        const [messages, rooms, drawingId] = await Promise.all([
            this.getMessages(roomId),
            this.getRooms(),
            this.redis.getAsync(`${roomId}/drawingid`)
        ]);

        const existingDrawingPoints = await this.drawingController.getRoomDrawingPoints(drawingId);

        console.log(`${this.username} entered room ${rooms[roomId].name}`);

        this.roomId = roomId;
        this.socket.join(roomId);

        const roomUsers = Object.keys(this.io.nsps['/'].adapter.rooms[roomId].sockets)
            .reduce(this.reduceRoomUsersHelper, {});

        let drawCount = 0;
        let groupCount = 0;

        const onMouseUp$ = fromEvent(this.socket, `${roomId}/draw/mouseup`)
            .pipe(tap(v => { drawCount = 0 }));

        const onDrawNewGroup$ = fromEvent(this.socket, `${roomId}/draw/newgroup`)
            .subscribe(() => {
                groupCount += 1;
                this.socket.broadcast.to(roomId).emit(`${roomId}/draw/newgroup`, userId);
            });

        const onDraw$ = fromEvent(this.socket, `${roomId}/draw`)
            .pipe(
                tap(v => { drawCount += 1 }),
                map((data: DrawingPointStream) => ({
                    ...data,
                    userId,
                    count: drawCount,
                    arrayGroup: groupCount,
                    name: rooms[roomId].name
                })),
                tap(point => this.socket.broadcast.to(roomId).emit(`${roomId}/draw`, point)),
                buffer(onMouseUp$),
                tap((drawingGroup: PointsGroup[]) => {
                    this.drawingController.savePointsGroup(drawingGroup);
                })
            );

        onDraw$.subscribe();

        const onDrawClear$: Observable<DrawResetData> = fromEvent(this.socket, `${roomId}/draw/reset`)

        onDrawClear$.subscribe((data) => {
            const { drawingId, userId } = data;

            this.io.to(roomId).emit(`${roomId}/draw/reset`, userId);
            //handle db remove
            this.drawingController.resetDrawing(drawingId);
        });

        this.socket.on(`${roomId}/messages`, this.onRoomMessage);
        this.socket.on(`${roomId}/draw/change`, this.onDrawChange);
        this.socket.on(`${roomId}/setadmin`, this.setAdmin);
        this.socket.on('disconnect', this.onRoomDisconnect);

        this.io.to(roomId).emit(`${roomId}/messages`, messages);
        this.io.to(roomId).emit(`${roomId}/users`, roomUsers);

        this.socket.emit(`${roomId}/setdrawing`, drawingId);
        this.socket.emit(`${roomId}/draw/getexisting`, existingDrawingPoints);
    }

    onRoomLeave = async (roomId: string) => {
        const rooms = await this.getRooms();

        console.log(`${this.username} leaving room ${rooms[roomId].name}`);

        this.socket.leave(roomId);

        const roomIsNotEmpty = !!this.io.nsps['/'].adapter.rooms[roomId];

        const roomUsers = roomIsNotEmpty ? Object.keys(this.io.nsps['/'].adapter.rooms[roomId].sockets)
            .reduce(this.reduceRoomUsersHelper, {}) : {};

        if (!roomIsNotEmpty) {
            await Promise.all([
                this.roomController.delete(roomId),
                this.redis.delAsync(roomId),
                this.redis.delAsync(`${roomId}/drawingid`)
            ]);

            const rooms = await this.getRooms();
            this.io.sockets.emit('rooms/get', rooms);
        }

        this.io.to(roomId).emit(`${roomId}/users`, roomUsers);

        this.socket.off(`${roomId}/messages`, this.onRoomMessage);
        this.socket.off(`${roomId}/draw/change`, this.onDrawChange);
        this.socket.off(`${roomId}/setadmin`, this.setAdmin);
        this.socket.off('disconnect', this.onRoomDisconnect);
    }

    onRoomDisconnect = async () => {
        const rooms = await this.getRooms();

        console.log(`disconnected from ${rooms[this.roomId].name}`);

        this.socket.leave(this.roomId);

        const roomIsNotEmpty = !!this.io.nsps['/'].adapter.rooms[this.roomId];

        const roomUsers = roomIsNotEmpty ? Object.keys(this.io.nsps['/'].adapter.rooms[this.roomId]
            .sockets).reduce(this.reduceRoomUsersHelper, {}) : {};

        if (!roomIsNotEmpty) {
            await Promise.all([
                this.roomController.delete(this.roomId),
                this.redis.delAsync(this.roomId),
                this.redis.delAsync(`${this.roomId}/drawingid`)
            ]);

            const rooms = await this.getRooms();
            this.io.sockets.emit('rooms/get', rooms);
        }

        this.io.to(this.roomId).emit(`${this.roomId}/users`, roomUsers);
        this.socket.off('disconnect', this.onRoomDisconnect);
    }

    setAdmin = async (data: SetAdminData) => {
        const { roomId } = data;

        console.log('new admin set');

        await this.roomController.setAdmin(data);

        const rooms = await this.getRooms();
        this.io.to(roomId).emit('rooms/get', rooms);
    }

    onRoomCreate = async (data: RoomCreateData) => {
        const { name, adminId, isPrivate, password, drawingId } = data;

        const createdRoom = await this.roomController.create({
            name,
            adminId,
            isPrivate,
            password: isPrivate ? password : null
        });

        const [rooms, _] = await Promise.all([
            this.getRooms(),
            this.redis.setAsync(`${createdRoom.dataValues.roomId}/drawingid`, drawingId)
        ]);

        this.io.sockets.emit('rooms/get', rooms);
        this.socket.emit('room/create', createdRoom.dataValues.roomId);
    }

    onUserDisconnected = async () => {
        console.log(`user disconnected ${this.username}`);

        const currentlyOnline = Object.keys(this.io.sockets.connected)
            .reduce(this.reduceConnectedHelper, {});

        currentlyOnline[this.username] && delete currentlyOnline[this.username];

        if (Object.keys(currentlyOnline).length) {
            await this.redis.hmsetAsync('users', currentlyOnline);
            this.io.sockets.emit('general/users', currentlyOnline);
        }
        else {
            await this.redis.delAsync('users');
            this.io.sockets.emit('general/users', {});
        }
    }

    reduceRoomsHelper = (acc: any, itm: any) => {
        acc[itm.roomId] = itm;
        return acc;
    }

    reduceConnectedHelper = (acc: any, itm: any) => {
        const src = this.io.sockets.connected[itm].handshake.query;
        acc[src.user] = src.id;
        return acc;
    };

    reduceRoomUsersHelper = (acc: any, itm: string) => {
        const { id, user } = this.io.nsps['/'].connected[itm].handshake.query;
        acc[id] = user;
        return acc;
    };
}
