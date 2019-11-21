import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import { controller, httpPost } from 'inversify-express-utils';

import { container } from './../container';
import { TYPES } from './../container/types';

import db from './../models';

import { IErrorMiddleware } from './../middleware/error';
const { catchAsyncHTTP } = container.get<IErrorMiddleware>(
  TYPES.ErrorMiddleware,
);

export interface IDrawingController {
  addOwner: (req: Request, res: Response) => void;
  saveAsJPEG: (req: Request, res: Response) => void;
}

@controller('/drawings/:drawingId', TYPES.AuthMiddleware)
export class DrawingController implements IDrawingController {
  @httpPost('/addowner')
  @catchAsyncHTTP
  async addOwner(req: Request, res: Response) {
    const { drawingId } = req.params;
    const { userId } = req.body;

    const drawing = await db.models.Drawing.findById(drawingId);
    if (!drawing) throw new Error('drawing is undefined');

    await drawing.addUser(userId.toString());

    const dbResp: any = await db.models.User.find({
      include: [{ model: db.models.Drawing }],
      where: { id: userId },
    });

    const drawings = dbResp!.get({ plain: true }).drawings;

    res.status(200).json(drawings);
  }

  @httpPost('/save')
  @catchAsyncHTTP
  async saveAsJPEG(req: Request, res: Response) {
    const { drawingId } = req.params;
    const { image } = req.body;

    const drawing = await db.models.Drawing.findById(drawingId);

    const version = drawing?.get({ plain: true }).version;
    const outputVersion = version !== undefined ? version + 1 : 0;

    const dirPath = path.join(__dirname, `../../public/images`);

    image.replace(/^data:image\/\w+;base64,/, '');
    const data = image.slice(image.indexOf(',') + 1).replace(/\s/g, '+');
    const buff = Buffer.from(data, 'base64');

    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath);

    const oldFilePath = `${dirPath}/${drawingId}-${version}.jpg`;
    if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);

    fs.writeFileSync(`${dirPath}/${drawingId}-${outputVersion}.jpg`, buff);

    console.log('file saved');

    res.status(200).json({
      message: 'success',
    });
  }
}
