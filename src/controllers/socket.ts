import events from 'events';
import { Socket, Server } from "socket.io";
import { RedisAsyncMethods } from "../socket";

import { RoomController, CreateData } from "./room";
import { DrawingController } from "./drawing";

interface MessageObject {
    author: string;
    message: string;
}

interface RoomCreateData {
    roomName: string;
    userId: number;
}

interface RoomsObject {
    [key: string]: string
}

const eventEmitter = new events.EventEmitter();

export class SocketController {
    private roomId: string = '';

    constructor(
        private io: Server,
        private socket: Socket,
        private username: string,
        private userId: number,
        private roomController: RoomController,
        private drawingController: DrawingController,
        private redis: RedisAsyncMethods
    ) { }

    onConnect = async () => {
        const rooms = await this.roomController.getAll();
        const roomsVal = rooms.reduce(this.reduceRoomsHelper, {});

        this.io.sockets.emit('rooms/get', roomsVal);

        const currentlyOnline = Object.keys(this.io.sockets.connected)
            .reduce(this.reduceConnectedHelper, {});

        await this.redis.hmsetAsync('general/users', currentlyOnline);

        const messages = await this.getMessages('general/messages');

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

    onDraw = async (data: object) => {
        const { userId, roomId } = this;

        //console.log(`${this.username} emits drawing event in ${roomId}`);

        const [drawCount, groupCount, rooms] = await Promise.all([
            this.redis.incrAsync(`${roomId}/drawCount`),
            this.redis.getAsync(`${roomId}/groupCount`),
            this.getRooms()
        ]);

        const drawingPoint = {
            ...data,
            userId,
            roomId,
            count: drawCount,
            arrayGroup: groupCount,
            name: rooms[roomId].name
        };

        this.socket.broadcast.to(this.roomId).emit(`${this.roomId}/draw`, drawingPoint);

        await this.redis.hmsetAsync(`${roomId}/drawingGroup/${groupCount}/${drawCount}`, drawingPoint);
        console.log(drawCount);
    }

    onDrawNewGroup = async (userId: string) => {
        const { roomId } = this;

        // const onDrawNewGroupFn = async () => {
        this.socket.broadcast.to(roomId).emit(`${roomId}/draw/newgroup`, userId);
        await this.redis.incrAsync(`${roomId}/groupCount`);
        //  };

        //eventEmitter.addListener(`${roomId}/newGroup`, onDrawNewGroupFn);
    }

    onDrawMouseUp = async () => {
        const { roomId } = this;

        console.log('received mouseup event');

        const [drawCount, groupCount] = await Promise.all([
            this.redis.getAsync(`${roomId}/drawCount`),
            this.redis.getAsync(`${roomId}/groupCount`)
        ]);

        let i = 1;
        const keysToResolve: any[] = [];

        while (i <= drawCount) {
            keysToResolve.push(`${roomId}/drawingGroup/${groupCount}/${i}`);
            i += 1;
        }
        // const keysToResolve = Array(drawCount).fill(null)
        //     .map((itm, i) => `${roomId}/drawingGroup/${groupCount}/${i + 1}`);
        //construct an array of drawing points
        //const drawingGroup = await Promise.all(keysToResolve.map((key) => this.redis.hgetallAsync(key)));
        //eventEmitter.emit(`${roomId}/drawingGroup/${groupCount}`);
        //eventEmitter.emit(`${roomId}/newGroup`);

        this.redis.std
            .batch(keysToResolve.map(key => ['hgetall', key]))
            .del(`${roomId}/drawCount`)
            .exec((err, replies) => {
                if (err) console.log('redis batch error');

                const drawingGroup = replies.slice(0, replies.length - 1);
                this.drawingController.savePointsGroup(drawingGroup);
                //remove from redis after db insertion
                keysToResolve.map((key) => this.redis.delAsync(key));
            });
    }

    onDrawClear = (userId: string) => {
        const { roomId } = this;

        this.io.to(roomId).emit(`${roomId}/draw/reset`, userId);
        //handle db remove
        this.drawingController.resetDrawing(roomId);
    }

    onRoomJoin = async (roomId: string) => {
        const rooms = await this.getRooms();

        console.log(`${this.username} entered room ${rooms[roomId].name}`);
        this.roomId = roomId;
        this.socket.join(roomId);

        const roomUsers = Object.keys(this.io.nsps['/'].adapter.rooms[roomId].sockets)
            .reduce(this.reduceRoomUsersHelper, {});

        this.socket.on(`${roomId}/messages`, this.onRoomMessage);
        this.socket.on(`${roomId}/draw`, this.onDraw);
        this.socket.on(`${roomId}/draw/newgroup`, this.onDrawNewGroup);
        this.socket.on(`${roomId}/draw/mouseup`, this.onDrawMouseUp);
        this.socket.on(`${roomId}/draw/reset`, this.onDrawClear);
        this.socket.on('disconnect', this.onRoomDisconnect);

        const messages = await this.getMessages(roomId);

        this.io.to(roomId).emit(`${roomId}/messages`, messages);
        this.io.to(roomId).emit(`${roomId}/users`, roomUsers);

        const roomDrawingPoints = await this.drawingController.getRoomDrawingPoints(roomId);
        this.socket.emit(`${roomId}/draw/getexisting`, roomDrawingPoints);
    }

    onRoomLeave = async (roomId: string) => {
        const rooms = await this.getRooms();

        console.log(`${this.username} leaving room ${rooms[roomId].name}`);

        this.socket.leave(roomId);

        const roomIsNotEmpty = !!this.io.nsps['/'].adapter.rooms[roomId];

        const roomUsers = roomIsNotEmpty ? Object.keys(this.io.nsps['/'].adapter.rooms[roomId].sockets)
            .reduce(this.reduceRoomUsersHelper, {}) : {};

        if (!roomIsNotEmpty) {
            await this.roomController.delete(roomId);
            await this.redis.delAsync(roomId);

            const rooms = await this.getRooms();
            this.io.sockets.emit('rooms/get', rooms);
        }

        this.io.to(roomId).emit(`${roomId}/users`, roomUsers);
        this.socket.off(`${roomId}/messages`, this.onRoomMessage);
        this.socket.off(`${roomId}/draw`, this.onDraw);
        this.socket.off(`${roomId}/draw/newgroup`, this.onDrawNewGroup);
        this.socket.off(`${roomId}/draw/reset`, this.onDrawClear);
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
            this.roomController.delete(this.roomId);
            await this.redis.delAsync(this.roomId);

            const rooms = await this.getRooms();
            this.io.sockets.emit('rooms/get', rooms);
        }

        this.io.to(this.roomId).emit(`${this.roomId}/users`, roomUsers);
        this.socket.off('disconnect', this.onRoomDisconnect);
    }

    onRoomCreate = async (data: RoomCreateData) => {
        const { roomName, userId } = data;

        const createdRoom = await this.roomController.create({
            name: roomName,
            adminId: userId
        });

        const rooms = await this.getRooms();

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
        acc[itm.dataValues.roomId] = itm.dataValues;
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
