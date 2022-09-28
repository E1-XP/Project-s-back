import fs from 'fs';
import path from 'path';

import { container } from './../container';
import { TYPES } from './../container/types';
import {
  controller,
  interfaces,
  httpPost,
  httpGet,
} from 'inversify-express-utils';
import { Request, Response } from 'express';

import { IErrorMiddleware } from './../middleware/error';
const { catchAsyncHTTP } = container.get<IErrorMiddleware>(
  TYPES.ErrorMiddleware,
);

import db from './../models';

@controller('/users/:userid', TYPES.AuthMiddleware)
export class UserController implements interfaces.Controller {
  @httpGet('/')
  @catchAsyncHTTP
  async getUser(req: Request, res: Response) {
    const { userId } = res.locals;

    const user = await db.models.User.findById(userId);

    if (user) {
      const { email, username } = user;

      res.status(200).json({ email, username, id: userId });
    } else {
      res.status(401).json({ message: 'invalid data provided' });
    }
  }

  @httpGet('/drawings')
  @catchAsyncHTTP
  async getDrawings(req: Request, res: Response) {
    const { userid } = req.params;

    const dbResp: any = await db.models.User.findAll({
      include: [{ model: db.models.Drawing }],
      where: { id: userid },
    });

    const drawings = dbResp[0].drawings;

    res.status(200).json({ drawings });
  }

  @httpPost('/drawings')
  @catchAsyncHTTP
  async createDrawing(req: Request, res: Response) {
    console.log(req.body);
    const { name, userId } = req.body;

    const drawing = await db.models.Drawing.create({
      name,
      version: 0,
      creatorId: userId,
    });

    await drawing.addUser(userId);

    const userWithDrawings: any = await db.models.User.findAll({
      include: [
        {
          model: db.models.Drawing,
        },
      ],
      where: { id: userId },
    });

    const drawings = userWithDrawings[0].drawings;

    const dirPath = path.join(__dirname, `../public`);
    const srcPath = path.join(dirPath, `/default.jpg`);
    const resPath = path.join(dirPath, `/images/${drawing.id}-v0.jpg`);

    fs.copyFile(srcPath, resPath, (err) => {
      if (err) throw err;
    });

    res.status(200).json({
      drawings,
      currentId: drawing.id,
    });
  }

  @httpGet('/inbox')
  @catchAsyncHTTP
  async getInboxMessages(req: Request, res: Response) {
    const { userid } = req.params;

    const messages = await db.models.Invitation.findAll({
      where: { receiverId: userid },
    });

    res.status(200).json({ messages });
  }
}
