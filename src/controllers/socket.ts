
import { Socket, Server } from "socket.io";
import { RedisAsyncMethods } from "../socket";

interface MessageObject {
    author: string;
    message: string;
}

interface RoomsObject {
    [key: string]: string
}

export class SocketController {
    private roomName: string = '';

    constructor(
        private io: Server,
        private socket: Socket,
        private username: string,
        private userId: number,
        private rooms: RoomsObject,
        private redis: RedisAsyncMethods
    ) { }

    onGeneralMessageReceived = async (data: MessageObject) => {
        console.log('got a new general message');
        const { message, author } = data;

        const messagesExists = await this.redis.existsAsync('general/messages');
        const messages = !!messagesExists ? await this.redis.hgetallAsync('general/messages') : {};
        messages[Date.now()] = `${message}\n${author}`;

        await this.redis.hmsetAsync('general/messages', messages);
        this.io.sockets.emit('general/messages', messages);
    }

    onRoomMessage = async (data: MessageObject) => {
        console.log(`message posted in ${this.roomName}`);
        const { message, author } = data;

        const messagesExists = await this.redis.existsAsync(this.roomName);
        const messages = !!messagesExists ? await this.redis.hgetallAsync(this.roomName) : {};
        messages[Date.now()] = `${message}\n${author}`;

        await this.redis.hmsetAsync(this.roomName, messages);
        this.io.to(this.roomName).emit(`${this.roomName}/messages`, messages);
    }

    onDraw = (data: object) => {
        const { userId } = this;
        //console.log(`${this.username} emits drawing event in ${this.roomName}`);

        // const drawPointsExists = await this.redis.existsAsync(room);
        // const drawPoints = !!messagesExists ? await this.redis.hgetallAsync(room) : {};
        const dataObject = { userId, data };

        this.socket.broadcast.to(this.roomName).emit(`${this.roomName}/draw`, dataObject);
        //this.io.to(this.roomName).emit(`${this.roomName}/draw`, data);
    }

    onDrawNewGroup = (userId: string) => {
        this.socket.broadcast.to(this.roomName).emit(`${this.roomName}/draw/newgroup`, userId);
    }

    onDrawClear = (userId: string) => {
        this.io.to(this.roomName).emit(`${this.roomName}/draw/reset`, userId);
    }

    onRoomJoin = async (room: string) => {
        console.log(`${this.username} entered room ${this.rooms[room]}`);
        this.roomName = room;
        this.socket.join(room);

        const roomUsers = Object.keys(this.io.nsps['/'].adapter.rooms[room].sockets)
            .reduce(this.reduceRoomUsersHelper, {});

        this.socket.on(`${room}/messages`, this.onRoomMessage);
        this.socket.on(`${room}/draw`, this.onDraw);
        this.socket.on(`${room}/draw/newgroup`, this.onDrawNewGroup);
        this.socket.on(`${room}/draw/reset`, this.onDrawClear);
        this.socket.on('disconnect', this.onRoomDisconnect);

        const messagesExists = await this.redis.existsAsync(room);
        const messages = !!messagesExists ? await this.redis.hgetallAsync(room) : {};

        this.io.to(room).emit(`${room}/messages`, messages);
        this.io.to(room).emit(`${room}/users`, roomUsers);
    }

    onRoomLeave = async (room: string) => {
        console.log(this.username + ' leaving room ' + this.rooms[room]);

        this.socket.leave(room);

        const roomIsNotEmpty = !!this.io.nsps['/'].adapter.rooms[room];
        const roomUsers = roomIsNotEmpty ? Object.keys(this.io.nsps['/'].adapter.rooms[room].sockets)
            .reduce(this.reduceRoomUsersHelper, {}) : {};

        this.io.to(room).emit(`${room}/users`, roomUsers);
        this.socket.off(`${room}/messages`, this.onRoomMessage);
        this.socket.off(`${room}/draw`, this.onDraw);
        this.socket.off(`${room}/draw/newgroup`, this.onDrawNewGroup);
        this.socket.off(`${room}/draw/reset`, this.onDrawClear);
        this.socket.off('disconnect', this.onRoomDisconnect);
    }

    onRoomDisconnect = () => {
        console.log('disconnected from ', this.roomName);

        this.socket.leave(this.roomName);

        const roomIsNotEmpty = !!this.io.nsps['/'].adapter.rooms[this.roomName];
        const roomUsers = roomIsNotEmpty ? Object.keys(this.io.nsps['/'].adapter.rooms[this.roomName].sockets)
            .reduce(this.reduceRoomUsersHelper, {}) : {};

        this.io.to(this.roomName).emit(`${this.roomName}/users`, roomUsers);
        this.socket.off('disconnect', this.onRoomDisconnect);
    }

    onRoomCreate = async (room: string) => {
        const roomsExists = await this.redis.existsAsync('rooms');
        this.rooms = !!roomsExists ? await this.redis.hgetallAsync('rooms') : {};

        this.rooms[Date.now()] = room;
        await this.redis.hmsetAsync('rooms', this.rooms);
        this.io.sockets.emit('rooms/get', this.rooms);
    }

    onUserDisconnected = async () => {
        console.log('user disconnected ', this.username);

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
