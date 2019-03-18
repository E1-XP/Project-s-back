import { controller, interfaces, httpPost } from "inversify-express-utils";
import { Request, Response } from "express-serve-static-core";

import { container } from "./../container";
import { TYPES } from "./../container/types";

import db from "../models";

export interface SetAdminData {
  userId: number;
  roomId: string;
}

export interface RoomController {
  checkPassword(req: Request, res: Response): Promise<void>;
}

@controller(
  "/rooms/:roomid",
  container.get<any>(TYPES.Middlewares).authRequired
)
export class RoomController implements RoomController {
  @httpPost("/checkpassword")
  async checkPassword(req: Request, res: Response) {
    const { roomid } = req.params;
    const { password } = req.body;

    try {
      const room = await db.models.Room.findOne({ where: { roomId: roomid } });

      room && room.getDataValue("password") === password
        ? res.status(200).send({ message: "success" })
        : res.status(401).send({ message: "incorrect password/error" });
    } catch (err) {
      console.log(err);
    }
  }
}
