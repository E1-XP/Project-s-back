import { container } from './../container';
import { TYPES } from './../container/types';
import {
  controller,
  interfaces,
  httpPost,
  httpGet,
} from 'inversify-express-utils';

import db from './../models';

import { Request, Response } from 'express-serve-static-core';

@controller(
  '/users/:userid',
  container.get<any>(TYPES.Middlewares).authRequired,
)
export class UserController implements interfaces.Controller {
  @httpGet('/')
  async getUser(req: Request, res: Response) {
    try {
      const { userId } = res.locals;

      const user = await db.models.User.findById(userId);

      if (user) {
        const { email, username } = user;

        res.status(200).json({ email, username, id: userId });
      } else {
        res.status(401).json({ message: 'invalid data provided' });
      }
    } catch (err) {
      console.log(err);
    }
  }

  @httpGet('/drawings')
  async getDrawings(req: Request, res: Response) {
    const { userid } = req.params;

    try {
      const dbResp: any = await db.models.User.findAll({
        include: [{ model: db.models.Drawing }],
        where: { id: userid },
      });

      const drawings = dbResp[0].drawings;

      res.status(200).json({ drawings: drawings });
    } catch (err) {
      console.log(err);
      res.status(500).json({ message: 'internal server error' });
    }
  }

  @httpPost('/drawings')
  async createDrawing(req: Request, res: Response) {
    console.log(req.body);
    const { name, userId } = req.body;

    try {
      const drawing = await db.models.Drawing.create({
        name,
        creatorId: userId,
      });

      drawing.addUser(userId);

      //return user drawings
      const dbResp: any = await db.models.User.findAll({
        include: [{ model: db.models.Drawing }],
        where: { id: userId },
      });

      const drawings = dbResp[0].drawings;

      res.status(200).json({
        currentId: drawing.id,
        drawings,
      });
    } catch (err) {
      console.log(err);
      res.status(500).json({ message: 'internal server error' });
    }
  }

  @httpGet('/inbox')
  async getInboxMessages(req: Request, res: Response) {
    const { userid } = req.params;

    try {
      const messages = await db.models.Invitation.findAll({
        where: { receiverId: userid },
      });

      res.status(200).json({ messages });
    } catch (err) {
      res.status(500).json({ message: 'internal server error' });
    }
  }
}
