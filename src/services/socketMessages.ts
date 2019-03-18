import { injectable } from "inversify";
import { Server } from "socket.io";

import db from "./../models";

import { IInvitation } from "../models/invitation";
import { Message } from "../models/message";

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
  onInboxMessage: (data: IInvitation) => void;
  getInboxData(userId: number): Promise<IInvitation[] | undefined>;
  getMessages: (roomId?: string) => Promise<Message[]>;
}

@injectable()
export class SocketMessageService implements ISocketMessageService {
  roomId: string | null = null;

  constructor(private io: Server) {}

  async onGeneralMessage(data: MessageObject) {
    console.log("got a new general message");

    const messages = await this.sendMessage({
      ...data,
      isGeneral: true
    });

    this.io.sockets.emit("general/messages", messages);
  }

  async onRoomMessage(data: MessageObject) {
    console.log(`message posted in ${this.roomId}`);

    const messages = await this.sendMessage({
      ...data,
      isGeneral: false,
      roomId: Number(this.roomId)
    });

    this.io.to(this.roomId!).emit(`${this.roomId}/messages`, messages);
  }

  async onInboxMessage(data: IInvitation) {
    const { receiverId } = data;

    console.log(`${receiverId} received a private message`);

    const inboxData = await this.updateInboxData(data);

    this.io.to(`${receiverId}/inbox`).emit(`inbox/new`, inboxData);
  }

  async getMessages(roomId?: string) {
    const isMessageGeneral = !roomId;

    const conditions = isMessageGeneral ? { isGeneral: true } : { roomId };

    const messages = await db.models.Message.findAll({ where: conditions });

    return messages;
  }

  async sendMessage(data: sendMessageData) {
    const { roomId } = data;
    const isMessageGeneral = data.isGeneral;

    await db.models.Message.create(data);

    const conditions = isMessageGeneral ? { isGeneral: true } : { roomId };

    const messages = await db.models.Message.findAll({ where: conditions });

    return messages;
  }

  async getInboxData(userId: number) {
    try {
      const messages = await db.models.Invitation.findAll({
        where: { receiverId: userId },
        order: [["id", "DESC"]]
      });

      return messages;
    } catch (err) {
      console.log(err);
    }
  }

  async updateInboxData(data: IInvitation) {
    try {
      const { receiverId } = data;

      const message = await db.models.Invitation.create(<any>data);

      const messages = await db.models.Invitation.findAll({
        where: { receiverId },
        order: [["id", "DESC"]]
      });

      return messages;
    } catch (err) {
      console.log(err);
    }
  }
}
