import { Http2Server } from "http2";
import { RedisClient } from "redis";
import socket, { Socket } from "socket.io";

import { SocketController } from "./controllers/socket";
import { RoomController } from "./controllers/room";
import { DrawingController } from "./controllers/drawing";
import { UserController } from "./controllers/user";

export const initSocket = async (server: Http2Server, redis: RedisClient) => {
  const io = socket(server);

  await redis.del("general/users");
  await redis.del("rooms");

  io.on("connection", (socket: Socket) => {
    console.log("new connection", socket.handshake.query.user);

    try {
      const username = socket.handshake.query.user;
      const userId = socket.handshake.query.id;

      const socketController = new SocketController( // TODO use DI
        io,
        socket,
        username,
        userId,
        new UserController(), // TODO use DI
        new RoomController(),
        new DrawingController(),
        redis
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
