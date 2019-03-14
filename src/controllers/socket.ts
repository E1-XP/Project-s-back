import { Socket, Server } from "socket.io";

import { UserController } from "./user";
import { RoomController } from "./room";
import { IDrawingController } from "./drawing";
import { DrawingPoint } from "../models/drawingpoints";
import { Room } from "../models/room";
import { IInvitation } from "../models/invitation";
import { RedisClient } from "redis";

interface MessageObject {
  authorId: number;
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

interface DrawResetData {
  userId: string;
  drawingId: number;
}

interface SetAdminData {
  roomId: string;
  userId: number;
}

export class SocketController {
  private roomId: string = "";

  constructor(
    private io: Server,
    private socket: Socket,
    private username: string,
    private userId: number,
    private userController: UserController,
    private roomController: RoomController,
    private drawingController: IDrawingController,
    private redis: RedisClient
  ) {}

  onConnect = async () => {
    const [rooms, messages] = await Promise.all([
      this.getRooms(),
      this.getMessages()
    ]);

    const currentlyOnline = Object.keys(this.io.sockets.connected).reduce(
      this.reduceConnectedHelper,
      {}
    );

    await this.redis.hmset("general/users", currentlyOnline);

    const initialData = { rooms, messages, users: currentlyOnline };

    const inboxData = await this.userController.getInboxData(this.userId);

    this.socket.join(`${this.userId}/inbox`);

    this.io.to(this.socket.id).emit(`${this.userId}/connect`, initialData);
    this.socket.broadcast.emit("general/users", currentlyOnline);
    this.socket.to(`${this.userId}/inbox`).emit(`inbox/get`, inboxData);
  };

  private getRooms = async () => {
    const rooms = await this.roomController.getAll();
    return rooms.reduce(this.reduceRoomsHelper, {});
  };

  private getMessages = async (roomId?: string) => {
    const messages = await this.roomController.getMessages(roomId);
    return messages;
  };

  onGeneralMessage = async (data: MessageObject) => {
    console.log("got a new general message");

    const messages = await this.roomController.sendMessage({
      ...data,
      isGeneral: true
    });

    this.io.sockets.emit("general/messages", messages);
  };

  onRoomMessage = async (data: MessageObject) => {
    console.log(`message posted in ${this.roomId}`);

    const messages = await this.roomController.sendMessage({
      ...data,
      isGeneral: false,
      roomId: Number(this.roomId)
    });

    this.io.to(this.roomId).emit(`${this.roomId}/messages`, messages);
  };

  onInboxMessage = async (data: IInvitation) => {
    const { receiverId } = data;

    console.log(`${receiverId} received a private message`);

    const inboxData = await this.userController.updateInboxData(data);

    this.io.to(`${receiverId}/inbox`).emit(`inbox/new`, inboxData);
  };

  onDrawChange = async (data: RoomJoinData) => {
    const { roomId, drawingId } = data;

    const existingDrawingPoints = await this.drawingController.getRoomDrawingPoints(
      drawingId
    );
    this.redis.set(`${roomId}/drawingid`, String(drawingId));

    this.socket.broadcast.to(roomId).emit(`${roomId}/draw/change`, drawingId);
    this.io
      .to(roomId)
      .emit(`${roomId}/draw/getexisting`, existingDrawingPoints);
  };

  onRoomJoin = async (data: RoomJoinData) => {
    const { roomId } = data;

    const [messages, rooms, drawingId] = await Promise.all([
      this.getMessages(roomId),
      this.getRooms(),
      <any>this.redis.get(`${roomId}/drawingid`)
    ]);

    const existingDrawingPoints = await this.drawingController.getRoomDrawingPoints(
      drawingId
    );

    console.log(`${this.username} entered room ${rooms[roomId].name}`);

    this.roomId = roomId;
    this.socket.join(roomId);

    const roomUsers = Object.keys(
      this.io.nsps["/"].adapter.rooms[roomId].sockets
    ).reduce(this.reduceRoomUsersHelper, {});

    let cachedPoints: DrawingPoint[] = [];
    this.socket.on(`${roomId}/draw`, async (point: DrawingPoint) => {
      this.socket.broadcast.to(roomId).emit(`${roomId}/draw`, point);
      cachedPoints.push(point);
    });

    this.socket.on(`${roomId}/draw/mouseup`, (data: string) => {
      if (this.isGroupSameLengthAndOrderCheck(data, cachedPoints)) {
        // perform check on other users
        this.socket.broadcast.emit(`${roomId}/drawgroupcheck`, data);
      } else {
        console.log("incorrect data");

        const groupInfo = data
          .split("|")
          .slice(0, 3)
          .map(Number);

        this.socket.emit(`${roomId}/resendcorrectdrawdata`, groupInfo);
        this.socket.once(
          `${roomId}/resendcorrectdrawdata`,
          async correctGroup => {
            if (!correctGroup.length) return;

            await this.drawingController.replaceDrawingPointsGroup(
              correctGroup
            );

            this.socket.broadcast
              .to(roomId)
              .emit(`${roomId}/sendcorrectgroup`, correctGroup);
          }
        );
      }

      this.drawingController.savePointsBulk(cachedPoints);
      cachedPoints = [];
    });

    this.socket.on(`${roomId}/sendcorrectgroup`, async (data: string) => {
      const [userIdStr, drawingIdStr, groupStr, tstamps] = data.split("|");
      const test = tstamps.split(".").map(str => Number(str));

      const correctGroup = await this.drawingController.getRoomDrawingPointsGroup(
        Number(userIdStr),
        Number(drawingIdStr),
        Number(groupStr)
      );

      if (correctGroup.length === test.length) {
        this.socket.emit(`${roomId}/sendcorrectgroup`, correctGroup);
      }
    });

    this.socket.on(`${roomId}/draw/reset`, data => {
      const { drawingId, userId } = data;

      this.io.to(roomId).emit(`${roomId}/draw/reset`, userId);
      this.drawingController.resetDrawing(drawingId);
    });

    this.socket.on(`${roomId}/messages`, this.onRoomMessage);
    this.socket.on(`${roomId}/draw/change`, this.onDrawChange);
    this.socket.on(`${roomId}/setadmin`, this.setAdmin);
    this.socket.on("disconnect", this.onRoomDisconnect);

    this.io.to(roomId).emit(`${roomId}/messages`, messages);
    this.io.to(roomId).emit(`${roomId}/users`, roomUsers);

    this.socket.emit(`${roomId}/setdrawing`, drawingId);
    this.socket.emit(`${roomId}/draw/getexisting`, existingDrawingPoints);
  };

  private isGroupSameLengthAndOrderCheck(
    data: string,
    cachedPoints: DrawingPoint[]
  ) {
    const [userIdStr, drawingIdStr, groupStrStr, tstamps] = data.split("|");
    const test = tstamps.split(".").map(Number);

    if (!cachedPoints.length || cachedPoints.length !== test.length) {
      return false;
    }

    return test.every((tstamp, i) => tstamp === cachedPoints[i].date);
  }

  onRoomLeave = async (roomId: string) => {
    const { userId, username } = this;
    const rooms = await this.getRooms();

    console.log(`${username} leaving room ${rooms[roomId].name}`);

    this.socket.leave(roomId);
    this.socket.leave(`${userId}/inbox`);

    const roomIsNotEmpty = !!this.io.nsps["/"].adapter.rooms[roomId];
    const isUserRoomAdmin = Number(rooms[roomId].adminId) === Number(userId);

    const roomUsers = roomIsNotEmpty
      ? Object.keys(this.io.nsps["/"].adapter.rooms[roomId].sockets).reduce(
          this.reduceRoomUsersHelper,
          {}
        )
      : {};

    if (!roomIsNotEmpty) {
      await Promise.all([
        this.roomController.delete(roomId),
        this.redis.del(roomId),
        this.redis.del(`${roomId}/drawingid`)
      ]);

      const rooms = await this.getRooms();
      this.io.sockets.emit("rooms/get", rooms);
    } else if (isUserRoomAdmin) {
      this.socket.broadcast.to(roomId).emit(`${roomId}/adminleaving`);
    }

    this.io.to(roomId).emit(`${roomId}/users`, roomUsers);

    this.socket.off(`${roomId}/messages`, this.onRoomMessage);
    this.socket.off(`${roomId}/draw/change`, this.onDrawChange);
    this.socket.off(`${roomId}/setadmin`, this.setAdmin);
    this.socket.off("disconnect", this.onRoomDisconnect);
  };

  onRoomDisconnect = async () => {
    const rooms = await this.getRooms();

    console.log(
      `${this.username} disconnected from ${rooms[this.roomId].name}`
    );

    this.socket.leave(this.roomId);
    this.socket.leave(`${this.userId}/inbox`);

    const roomIsNotEmpty = !!this.io.nsps["/"].adapter.rooms[this.roomId];
    const isUserRoomAdmin =
      Number(rooms[this.roomId].adminId) === Number(this.userId);

    const roomUsers = roomIsNotEmpty
      ? Object.keys(
          this.io.nsps["/"].adapter.rooms[this.roomId].sockets
        ).reduce(this.reduceRoomUsersHelper, {})
      : {};

    if (!roomIsNotEmpty) {
      await Promise.all([
        this.roomController.delete(this.roomId),
        this.redis.del(this.roomId),
        this.redis.del(`${this.roomId}/drawingid`)
      ]);

      const rooms = await this.getRooms();
      this.io.sockets.emit("rooms/get", rooms);
    } else if (isUserRoomAdmin) {
      this.socket.broadcast.to(this.roomId).emit(`${this.roomId}/adminleaving`);
    }

    this.io.to(this.roomId).emit(`${this.roomId}/users`, roomUsers);
    this.socket.off("disconnect", this.onRoomDisconnect);
  };

  private setAdmin = async (data: SetAdminData) => {
    const { roomId } = data;

    console.log("new admin set");

    await this.roomController.setAdmin(data);

    const rooms = await this.getRooms();
    this.io.to(roomId).emit("rooms/get", rooms);
  };

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
      this.redis.set(
        `${createdRoom.dataValues.roomId}/drawingid`,
        String(drawingId)
      )
    ]);

    this.io.sockets.emit("rooms/get", rooms);
    this.socket.emit("room/create", createdRoom.dataValues.roomId);
  };

  onUserDisconnected = async () => {
    console.log(`user disconnected ${this.username}`);

    const currentlyOnline = Object.keys(this.io.sockets.connected).reduce(
      this.reduceConnectedHelper,
      {}
    );

    currentlyOnline[this.username] && delete currentlyOnline[this.username];

    if (Object.keys(currentlyOnline).length) {
      await this.redis.hmset("users", currentlyOnline);
      this.io.sockets.emit("general/users", currentlyOnline);
    } else {
      await this.redis.del("users");
      this.io.sockets.emit("general/users", {});
    }
  };

  private reduceRoomsHelper = (acc: any, itm: any) => {
    acc[itm.roomId] = itm;
    return acc;
  };

  private reduceConnectedHelper = (acc: any, itm: any) => {
    const src = this.io.sockets.connected[itm].handshake.query;
    acc[src.id] = src.user;
    return acc;
  };

  private reduceRoomUsersHelper = (acc: any, itm: string) => {
    const { id, user } = this.io.nsps["/"].connected[itm].handshake.query;
    acc[id] = user;
    return acc;
  };
}
