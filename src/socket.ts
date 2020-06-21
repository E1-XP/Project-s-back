import { Http2Server } from 'http2';
import { RedisClient } from 'redis';
import socket, { Socket } from 'socket.io';

import { container } from './container';
import { TYPES } from './container/types';

import { redisDB } from './models/redis';

import { SocketRoomService, ISocketRoomService } from './services/socketRoom';
import { SocketDrawingService } from './services/socketDrawing';
import { SocketMessageService } from './services/socketMessages';
import { IErrorMiddleware } from './middleware/error';

const { catchAsync } = container.get<IErrorMiddleware>(TYPES.ErrorMiddleware);

export class SocketInitializer {
  private server: Http2Server;
  private redis: RedisClient;
  private io: socket.Server;
  private socket: Socket | null = null;
  private roomService: ISocketRoomService | null = null;
  private userId: number | null = null;
  private username: string | null = null;

  constructor(server: Http2Server, redis: RedisClient) {
    this.server = server;
    this.redis = redis;
    this.io = socket(server, { pingTimeout: 5000, pingInterval: 2000 });

    this.onInit();
  }

  async onInit() {
    await this.redis.del('general/users');
    await this.redis.del('rooms');

    this.io.on('connection', this.onConnect.bind(this));
  }

  private onConnect(socket: Socket) {
    console.log('new connection', socket.handshake.query.user);

    this.socket = socket;

    this.username = socket.handshake.query.user;
    this.userId = socket.handshake.query.id;

    this.roomService = new SocketRoomService(
      this.io,
      this.socket,
      new SocketMessageService(socket, this.io),
      new SocketDrawingService(socket, this.io),
    );

    this.onConnectHandler();
    this.bindHandlers();
  }

  private bindHandlers() {
    if (!this.roomService || !this.socket) {
      throw new Error('initialization error');
    }

    const { messageService } = this.roomService;

    this.socket.on(
      'general/messages/write',
      messageService.onMessageWrite.bind(messageService),
    );

    this.socket.on(
      'general/messages',
      messageService.onGeneralMessage.bind(messageService),
    );

    this.socket.on(
      `${this.userId}/inbox`,
      messageService.onInboxMessage.bind(messageService),
    );

    this.socket.on(
      'room/join',
      this.roomService.onRoomJoin.bind(this.roomService),
    );

    this.socket.on(
      'room/leave',
      this.roomService.onRoomLeave.bind(this.roomService),
    );

    this.socket.on(
      'room/create',
      this.roomService.onRoomCreate.bind(this.roomService),
    );

    this.socket.on('disconnect', this.onUserDisconnected.bind(this));
  }

  private async onConnectHandler() {
    if (!this.roomService || !this.socket || !this.userId) {
      throw new Error('initialization error');
    }

    const [rooms, messages] = await Promise.all([
      this.roomService.getRooms(),
      this.roomService.messageService.getMessages(),
    ]);

    const currentlyOnline = Object.keys(this.io.sockets.connected).reduce(
      this.reduceConnected.bind(this),
      {},
    );

    await redisDB.hmset('general/users', currentlyOnline);

    const initialData = { rooms, messages, users: currentlyOnline };

    const inboxData = await this.roomService.messageService.getInboxData(
      this.userId,
    );

    this.socket.join(`${this.userId}/inbox`);

    this.io.to(this.socket.id).emit(`${this.userId}/connect`, initialData);
    this.socket.broadcast.emit('general/users', currentlyOnline);
    this.socket.to(`${this.userId}/inbox`).emit(`inbox/get`, inboxData);
  }

  @catchAsync
  async onUserDisconnected() {
    console.log(`${this.username} disconnected `);

    const currentlyOnline: any = Object.keys(this.io.sockets.connected).reduce(
      this.reduceConnected.bind(this),
      {},
    );

    currentlyOnline[this.username!] && delete currentlyOnline[this.username!];

    if (Object.keys(currentlyOnline).length) {
      await redisDB.hmset('users', currentlyOnline);
      this.io.sockets.emit('general/users', currentlyOnline);
    } else {
      await redisDB.del('users');
      this.io.sockets.emit('general/users', {});
    }
  }

  private reduceConnected(acc: any, itm: string) {
    const src = this.io.sockets.connected[itm].handshake.query;
    acc[src.id] = src.user;
    return acc;
  }
}
