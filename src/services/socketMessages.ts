import { Server, Socket } from 'socket.io';

import { container } from './../container';
import { TYPES } from './../container/types';

import { IInvitation } from '../models/invitation';
import { Message } from '../models/message';
import { IErrorMiddleware } from './../middleware/error';

import db from './../models';

const { catchAsync } = container.get<IErrorMiddleware>(TYPES.ErrorMiddleware);

interface MessageObject {
  authorId: number;
  author: string;
  message: string;
}

export interface sendMessageData {
  authorId: number;
  author: string;
  message: string;
  roomId?: number | null;
  isGeneral: boolean;
}

export interface ISocketMessageService {
  roomId: string | null;
  onGeneralMessage: (data: MessageObject) => void;
  onRoomMessage: (data: MessageObject) => void;
  onMessageWrite(channel: string): void;
  onInboxMessage: (data: IInvitation) => void;
  getInboxData(userId: number): Promise<IInvitation[] | undefined>;
  getMessages: (roomId?: string) => Promise<Message[]>;
}

export class SocketMessageService implements ISocketMessageService {
  roomId: string | null = null;

  constructor(private socket: Socket, private server: Server) {}

  @catchAsync
  async onGeneralMessage(data: MessageObject) {
    console.log('got a new general message');

    const messages = await this.sendMessage({
      ...data,
      isGeneral: true,
    });

    this.server.sockets.emit('general/messages', messages);
  }

  onMessageWrite(channel: string) {
    const isGeneral = channel === 'general'; // else roomId
    const userId = this.socket.handshake.query.id;

    isGeneral
      ? this.socket.broadcast.emit('general/messages/write', userId)
      : this.socket.broadcast
          .to(channel)
          .emit(`${channel}/messages/write`, userId);
  }

  @catchAsync
  async onRoomMessage(data: MessageObject) {
    console.log(`message posted in ${this.roomId}`);

    const messages = await this.sendMessage({
      ...data,
      isGeneral: false,
      roomId: Number(this.roomId),
    });

    this.server.to(this.roomId!).emit(`${this.roomId}/messages`, messages);
  }

  @catchAsync
  async onInboxMessage(data: IInvitation) {
    const { receiverId } = data;

    console.log(`${receiverId} received a private message`);

    const inboxData = await this.updateInboxData(data);

    this.server.to(`${receiverId}/inbox`).emit(`inbox/new`, inboxData);
  }

  @catchAsync
  async getMessages(roomId?: string) {
    const isMessageGeneral = !roomId;

    const conditions = isMessageGeneral ? { isGeneral: true } : { roomId };

    const messages = await db.models.Message.findAll({ where: conditions });

    return messages;
  }

  @catchAsync
  async sendMessage(data: sendMessageData) {
    const { roomId } = data;
    const isMessageGeneral = data.isGeneral;

    await db.models.Message.create(data);

    const conditions = isMessageGeneral ? { isGeneral: true } : { roomId };

    const messages = await db.models.Message.findAll({ where: conditions });

    return messages;
  }

  @catchAsync
  async getInboxData(userId: number) {
    const messages = await db.models.Invitation.findAll({
      where: { receiverId: userId },
      order: [['id', 'DESC']],
    });

    return messages;
  }

  @catchAsync
  async updateInboxData(data: IInvitation) {
    const { receiverId } = data;

    await db.models.Invitation.create(<any>data);

    const messages = await db.models.Invitation.findAll({
      where: { receiverId },
      order: [['id', 'DESC']],
    });

    return messages;
  }
}
