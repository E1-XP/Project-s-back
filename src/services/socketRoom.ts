import { Socket, Server } from "socket.io";

import { Room, RoomInstance } from "../models/room";

import { ISocketMessageService } from "./../services/socketMessages";
import { ISocketDrawingService } from "./../services/socketDrawing";

import db from "./../models";
import { redisDB } from "./../models/redis";

export interface RoomJoinData {
  roomId: string;
  drawingId: number;
}

interface RoomCreateData extends Room {
  drawingId: number;
}

export interface RoomCreationData {
  name: string;
  adminId: number;
  isPrivate: boolean;
  password: string | null;
}

interface Rooms {
  [key: string]: Room;
}

interface SetAdminData {
  roomId: string;
  userId: number;
}

export interface ISocketRoomService {
  messageService: ISocketMessageService;
  drawingService: ISocketDrawingService;
  onRoomJoin(data: RoomJoinData): void;
  onRoomLeave(): void;
  onRoomDisconnect(): void;
  onRoomCreate(data: RoomCreateData): void;
  onUserDisconnected(): void;
  getRooms(): Promise<Rooms>;
}

export class SocketRoomService implements ISocketRoomService {
  private roomId: string | null = null;
  private username: string | null = null;
  private userId: number | null = null;

  constructor(
    private io: Server,
    private socket: Socket,
    public messageService: ISocketMessageService,
    public drawingService: ISocketDrawingService
  ) {}

  async onRoomJoin(data: RoomJoinData) {
    const { roomId } = data;

    const [messages, rooms, drawingId] = await Promise.all([
      this.messageService.getMessages(roomId),
      this.getRooms(),
      <any>redisDB.get(`${roomId}/drawingid`)
    ]);

    const existingDrawingPoints = await this.drawingService.getRoomDrawingPoints(
      drawingId
    );

    this.roomId = roomId;
    this.username = this.socket.handshake.query.user;
    this.userId = this.socket.handshake.query.id;

    this.drawingService.roomId = roomId;
    this.messageService.roomId = roomId;

    console.log(`${this.username} entered room ${rooms[roomId].name}`);

    this.socket.join(roomId);

    const roomUsers = Object.keys(
      this.io.nsps["/"].adapter.rooms[roomId].sockets
    ).reduce(this.reduceRoomUsers.bind(this), {});

    this.toggleHandlers("on");

    this.io.to(roomId).emit(`${roomId}/messages`, messages);
    this.io.to(roomId).emit(`${roomId}/users`, roomUsers);

    this.socket.emit(`${roomId}/setdrawing`, drawingId);
    this.socket.emit(`${roomId}/draw/getexisting`, existingDrawingPoints);
  }

  private toggleHandlers(mode: "on" | "off") {
    this.socket[mode](
      `${this.roomId}/messages`,
      this.messageService.onRoomMessage.bind(this.messageService)
    );

    this.socket[mode](
      `${this.roomId}/messages/write`,
      this.messageService.onMessageWrite.bind(this.messageService)
    );

    this.socket[mode](
      `${this.roomId}/draw`,
      this.drawingService.onDraw.bind(this.drawingService)
    );

    this.socket[mode](
      `${this.roomId}/draw/mouseup`,
      this.drawingService.onMouseUp.bind(this.drawingService)
    );

    this.socket[mode](
      `${this.roomId}/sendcorrectgroup`,
      this.drawingService.onSendCorrectGroup.bind(this.drawingService)
    );

    this.socket[mode](
      `${this.roomId}/draw/reset`,
      this.drawingService.onDrawReset.bind(this.drawingService)
    );

    this.socket[mode](
      `${this.roomId}/draw/change`,
      this.drawingService.onDrawChange.bind(this.drawingService)
    );

    this.socket[mode](`${this.roomId}/setadmin`, this.setAdmin.bind(this));
    this.socket[mode]("disconnect", this.onRoomDisconnect.bind(this));
  }

  async onRoomLeave() {
    this.handleRoomLeave();
    this.toggleHandlers("off");
  }

  private async deleteRoom(roomId: string) {
    await db.models.Room.destroy({
      where: { roomId }
    });
  }

  private async handleRoomLeave(isDisconnected = false) {
    const rooms = await this.getRooms();

    const logStr = isDisconnected ? "disconnected from" : "leaving";
    console.log(`${this.username} ${logStr} room ${rooms[this.roomId!].name}`);

    this.socket.leave(this.roomId!);
    this.socket.leave(`${this.userId}/inbox`);

    const isUserRoomAdmin =
      Number(rooms[this.roomId!].adminId) === Number(this.userId);
    const roomIsNotEmpty = !!this.io.nsps["/"].adapter.rooms[this.roomId!];

    if (!roomIsNotEmpty) {
      await Promise.all([
        this.deleteRoom(this.roomId!),
        redisDB.del(this.roomId!),
        redisDB.del(`${this.roomId}/drawingid`)
      ]);

      const rooms = await this.getRooms();
      this.io.sockets.emit("rooms/get", rooms);
    } else if (isUserRoomAdmin) {
      this.socket.broadcast
        .to(this.roomId!)
        .emit(`${this.roomId}/adminleaving`);
    }

    const roomUsers = roomIsNotEmpty
      ? Object.keys(
          this.io.nsps["/"].adapter.rooms[this.roomId!].sockets
        ).reduce(this.reduceRoomUsers.bind(this), {})
      : {};

    this.io.to(this.roomId!).emit(`${this.roomId}/users`, roomUsers);
  }

  async onRoomDisconnect() {
    const rooms = await this.getRooms();

    console.log(
      `${this.username} disconnected from ${rooms[this.roomId!].name}`
    );

    this.handleRoomLeave(true);

    this.socket.off("disconnect", this.onRoomDisconnect);
  }

  private async setAdmin(data: SetAdminData) {
    const { roomId, userId } = data;

    console.log("new admin set");

    await db.models.Room.update({ adminId: userId }, { where: { roomId } });

    const rooms = await this.getRooms();
    this.io.to(roomId).emit("rooms/get", rooms);
  }

  async onRoomCreate(data: RoomCreateData) {
    const { name, adminId, isPrivate, password, drawingId } = data;

    const createdRoom = await this.createRoom({
      name,
      adminId,
      isPrivate,
      password: isPrivate ? password : null
    });

    const [rooms, _] = await Promise.all([
      this.getRooms(),
      redisDB.set(
        `${createdRoom.dataValues.roomId}/drawingid`,
        drawingId.toString()
      )
    ]);

    this.io.sockets.emit("rooms/get", rooms);
    this.socket.emit("room/create", createdRoom.dataValues.roomId);
  }

  private async createRoom(data: RoomCreationData) {
    const { name, adminId, isPrivate, password } = data;

    const roomCreated = <Room>await db.models.Room.create({
      name,
      adminId,
      roomId: Date.now(),
      password,
      isPrivate
    });

    return <Room>Object.keys(roomCreated).reduce((acc: any, key) => {
      if (key !== "password") acc[key] = roomCreated[key];
      return acc;
    }, {});
  }

  async onUserDisconnected() {
    console.log(`user disconnected ${this.username}`);

    const currentlyOnline: any = Object.keys(this.io.sockets.connected).reduce(
      this.reduceConnected.bind(this),
      {}
    );

    currentlyOnline[this.username!] && delete currentlyOnline[this.username!];

    if (Object.keys(currentlyOnline).length) {
      await redisDB.hmset("users", currentlyOnline);
      this.io.sockets.emit("general/users", currentlyOnline);
    } else {
      await redisDB.del("users");
      this.io.sockets.emit("general/users", {});
    }
  }

  async getRooms() {
    const allRooms = <Room[]>await db.models.Room.findAll({});

    const rooms = <Room[]>allRooms.map(itm =>
      Object.keys(itm.dataValues).reduce((acc: any, key) => {
        if (key !== "password") acc[key] = itm.dataValues[key];
        return acc;
      }, {})
    );

    return <Rooms>rooms.reduce((acc: Rooms, itm: Room) => {
      acc[itm.roomId] = itm;
      return acc;
    }, {});
  }

  private reduceConnected(acc: any, itm: string) {
    const src = this.io.sockets.connected[itm].handshake.query;
    acc[src.id] = src.user;
    return acc;
  }

  private reduceRoomUsers(acc: any, itm: string) {
    const { id, user } = this.io.nsps["/"].connected[itm].handshake.query;
    acc[id] = user;
    return acc;
  }
}
