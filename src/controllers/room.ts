import { inject } from "inversify";
import { controller, interfaces, httpPost } from "inversify-express-utils";
import { container } from "./../container";
import { TYPES } from "./../container/types";

import db from "../models";

import { Room } from "../models/room";
import { Request, Response } from "express-serve-static-core";

export interface SetAdminData {
  userId: number;
  roomId: string;
}

export interface sendMessageData {
  authorId: number;
  author: string;
  message: string;
  roomId?: number | null;
  isGeneral: boolean;
}
export interface RoomController {
  getAll: () => Promise<Room[]>;
  create: (v: Room) => Promise<Room>;
  delete: (v: string) => Promise<void>;
  // checkPassword: (req: Request, res: Response) => Promise<void>;
  setAdmin: (v: SetAdminData) => Promise<void>;
}

@controller(
  "/rooms/:roomid",
  container.get<any>(TYPES.Middlewares).authRequired
)
export class RoomController implements RoomController {
  getAll = async () => {
    const allRooms = <Room[]>await db.models.Room.findAll({});

    return <Room[]>allRooms.map(itm =>
      Object.keys(itm.dataValues).reduce((acc: any, key) => {
        if (key !== "password") acc[key] = itm.dataValues[key];
        return acc;
      }, {})
    );
  };

  create = async (data: Room) => {
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
  };

  delete = async (roomId: string) => {
    await db.models.Room.destroy({
      where: { roomId }
    });
  };

  @httpPost("/checkpassword")
  async checkPassword(req: Request, res: Response) {
    const { roomid } = req.params;
    const { password } = req.body;

    const room = await db.models.Room.findOne({ where: { roomId: roomid } });

    room && room.getDataValue("password") === password
      ? res.status(200).send({ message: "success" })
      : res.status(401).send({ message: "incorrect password/error" });
  }

  setAdmin = async (data: SetAdminData) => {
    const { roomId, userId } = data;

    await db.models.Room.update({ adminId: userId }, { where: { roomId } });
  };

  getMessages = async (roomId?: string) => {
    const isMessageGeneral = !roomId;

    const conditions = isMessageGeneral ? { isGeneral: true } : { roomId };

    const messages = await db.models.Message.findAll({ where: conditions });

    return messages;
  };

  sendMessage = async (data: sendMessageData) => {
    const { roomId } = data;
    const isMessageGeneral = data.isGeneral;

    await db.models.Message.create(data);

    const conditions = isMessageGeneral ? { isGeneral: true } : { roomId };

    const messages = await db.models.Message.findAll({ where: conditions });
    console.log(messages, "CHECK THIS");
    return messages;
  };
}
