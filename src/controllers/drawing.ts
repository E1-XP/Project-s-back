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
  saveAsFile: (req: Request, res: Response) => void;
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
  async saveAsFile(req: Request, res: Response) {
    const { drawingId } = req.params;
    const { image } = req.body;

    const drawing = await db.models.Drawing.findByPk(drawingId);
    if (!drawing) return res.status(404).json({ message: 'drawing not found' });

    const version = drawing.get({ plain: true }).version;
    const outputVersion = version + 1;

    drawing.version = outputVersion;
    drawing.save();

    const dirPath = path.join(__dirname, `../../public/images`);

    image.replace(/^data:image\/\w+;base64,/, '');
    const data = image.slice(image.indexOf(',') + 1).replace(/\s/g, '+');
    const buff = Buffer.from(data, 'base64');

    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath);

    const oldFilePath = `${dirPath}/${drawingId}-v${version}.jpg`;
    if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);

    fs.writeFileSync(`${dirPath}/${drawingId}-v${outputVersion}.jpg`, buff);

    console.log('file saved');

    res.status(200).json({
      message: 'success',
    });
  }
}
