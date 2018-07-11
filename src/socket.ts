import { promisify } from 'util';
import { RedisClient } from 'redis';
import socket, { Socket } from 'socket.io';
import { SocketController } from './controllers/socket';
import { Http2Server } from 'http2';

export interface RedisAsyncMethods {
    hmsetAsync: (str: string, val: any) => any;
    hgetallAsync: (str: string) => any;
    delAsync: (str: string) => any;
    existsAsync: (str: string) => number;
}

const initSocket = async (server: Http2Server, redis: RedisClient) => {
    const io = socket(server);

    const redisAsync: RedisAsyncMethods = {
        hmsetAsync: promisify(redis.hmset.bind(redis)),
        hgetallAsync: promisify(redis.hgetall.bind(redis)),
        delAsync: promisify(redis.del.bind(redis)),
        existsAsync: promisify(redis.exists.bind(redis))
    };

    await redisAsync.delAsync('general/users');

    io.on('connection', async (socket: Socket) => {
        console.log('new connection', socket.handshake.query.user);

        try {
            const username = socket.handshake.query.user;

            const roomsExists = await redisAsync.existsAsync('rooms');
            const rooms = !!roomsExists ? await redisAsync.hgetallAsync('rooms') : {};

            const socketController = new SocketController(io, socket, username, rooms, redisAsync);

            const currentlyOnline = Object.keys(io.sockets.connected)
                .reduce(socketController.reduceConnectedHelper, {});

            await redisAsync.hmsetAsync('general/users', currentlyOnline);

            const messagesExists = await redisAsync.existsAsync('general/messages');
            const messages = !!messagesExists ? await redisAsync.hgetallAsync('general/messages') : {};

            io.sockets.emit('general/users', currentlyOnline);
            io.sockets.emit('general/messages', messages);
            io.sockets.emit('rooms/get', rooms);

            socket.on('general/messages', socketController.onGeneralMessageReceived);
            socket.on('room/join', socketController.onRoomJoin);
            socket.on('room/leave', socketController.onRoomLeave);
            socket.on('room/create', socketController.onRoomCreate);
            socket.on('disconnect', socketController.onUserDisconnected);
        }
        catch (err) {
            console.log(err);
        }
    });
};

export default initSocket;
