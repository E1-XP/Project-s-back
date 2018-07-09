import { promisify } from 'util';
import socket from 'socket.io';
import { Http2Server } from 'http2';
import { RedisClient } from 'redis';

interface messageObject {
    author: string;
    message: string;
}

const initSocket = async (server: Http2Server, redis: RedisClient) => {
    const io = socket(server);

    const hmsetAsync = promisify(redis.hmset.bind(redis));
    const hgetallAsync = promisify(redis.hgetall.bind(redis));
    const delAsync = promisify(redis.del.bind(redis));
    const existsAsync = promisify(redis.exists.bind(redis));

    try {
        await delAsync('general/users');

        io.on('connection', async socket => {
            console.log('new connection', socket.handshake.query.user);
            const newUser = socket.handshake.query.user;
            const newUserId = socket.handshake.query.id;


            socket.on('disconnect', async () => {
                console.log('user disconnected ', newUser);

            });
        });
    }
    catch (err) {
        console.log(err);
    }
};

export default initSocket;
