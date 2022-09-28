import { controller, interfaces, httpPost } from 'inversify-express-utils';
import { Request, Response } from 'express';

import { container } from './../container';
import { TYPES } from './../container/types';

import db from '../models';

import { IErrorMiddleware } from './../middleware/error';
const { catchAsyncHTTP } = container.get<IErrorMiddleware>(
  TYPES.ErrorMiddleware,
);

export interface SetAdminData {
  userId: number;
  roomId: string;
}

export interface RoomController {
  checkPassword(req: Request, res: Response): Promise<void>;
}

@controller('/rooms/:roomid', TYPES.AuthMiddleware)
export class RoomController implements RoomController {
  @httpPost('/checkpassword')
  @catchAsyncHTTP
  async checkPassword(req: Request, res: Response) {
    const { roomid } = req.params;
    const { password } = req.body;

    const room = await db.models.Room.findOne({ where: { roomId: roomid } });

    if (!room) {
      res.status(404).send({ message: 'room not found' });
    } else if (room && room.getDataValue('password') === password) {
      res.status(200).send({ message: 'success' });
    } else res.status(401).send({ message: 'incorrect password' });
  }
}
