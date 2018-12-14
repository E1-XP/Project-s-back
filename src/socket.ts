import { promisify } from "util";
import { Http2Server } from "http2";
import { RedisClient } from "redis";
import socket, { Socket } from "socket.io";

import { SocketController } from "./controllers/socket";
import { RoomController } from "./controllers/room";
import { DrawingController } from "./controllers/drawing";
import { UserController } from "./controllers/user";

export interface RedisAsyncMethods {
  incrAsync: (key: string) => number;
  getAsync: (key: string) => any;
  setAsync: (key: string, val: any) => any;
  hsetAsync: (key: string, field: string, val: any) => any;
  hmsetAsync: (str: string, val: any) => any;
  hdelAsync: (key: string, field: string) => any;
  hgetallAsync: (str: string) => any;
  delAsync: (str: string) => any;
  existsAsync: (str: string) => number;
  std: RedisClient;
}

const initSocket = async (server: Http2Server, redis: RedisClient) => {
  const io = socket(server);

  const redisAsync: RedisAsyncMethods = {
    incrAsync: promisify(redis.incr.bind(redis)),
    getAsync: promisify(redis.get.bind(redis)),
    setAsync: promisify(redis.set.bind(redis)),
    hsetAsync: promisify(redis.hset.bind(redis)),
    hmsetAsync: promisify(redis.hmset.bind(redis)),
    hdelAsync: promisify(redis.hdel.bind(redis)),
    hgetallAsync: promisify(redis.hgetall.bind(redis)),
    delAsync: promisify(redis.del.bind(redis)),
    existsAsync: promisify(redis.exists.bind(redis)),
    std: redis
  };

  await redisAsync.delAsync("general/users");
  await redisAsync.delAsync("rooms");

  io.on("connection", async (socket: Socket) => {
    console.log("new connection", socket.handshake.query.user);

    try {
      const username = socket.handshake.query.user;
      const userId = socket.handshake.query.id;

      const socketController = new SocketController(
        io,
        socket,
        username,
        userId,
        new UserController(),
        new RoomController(),
        new DrawingController(),
        redisAsync
      );

      socketController.onConnect();

      socket.on("general/messages", socketController.onGeneralMessage);
      socket.on(`${userId}/inbox`, socketController.onInboxMessage);
      socket.on("room/join", socketController.onRoomJoin);
      socket.on("room/leave", socketController.onRoomLeave);
      socket.on("room/create", socketController.onRoomCreate);
      socket.on("disconnect", socketController.onUserDisconnected);
    } catch (err) {
      console.log(err);
    }
  });
};

export default initSocket;
