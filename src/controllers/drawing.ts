import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express-serve-static-core';
import { controller, httpPost } from 'inversify-express-utils';

import { container } from './../container';
import { TYPES } from './../container/types';

import db from './../models';

export interface IDrawingController {
  addOwner: (req: Request, res: Response) => void;
  saveAsJPEG: (req: Request, res: Response) => void;
}

@controller(
  '/drawings/:drawingId',
  container.get<any>(TYPES.Middlewares).authRequired,
)
export class DrawingController implements IDrawingController {
  @httpPost('/addowner')
  async addOwner(req: Request, res: Response) {
    const { drawingId } = req.params;
    const { userId } = req.body;

    try {
      const drawing = await db.models.Drawing.findById(drawingId);
      if (!drawing) throw new Error('drawing is undefined');

      await drawing.addUser(userId.toString());

      const dbResp: any = await db.models.User.find({
        include: [{ model: db.models.Drawing }],
        where: { id: userId },
      });

      const drawings = dbResp!.get({ plain: true }).drawings;

      res.status(200).json(drawings);
    } catch (err) {
      console.log(err);
      res.status(500).json({ message: 'internal server error' });
    }
  }

  @httpPost('/save')
  saveAsJPEG(req: Request, res: Response) {
    const { drawingId } = req.params;
    const { image } = req.body;

    const dirPath = path.join(__dirname, `../../public/images`);

    image.replace(/^data:image\/\w+;base64,/, '');
    const data = image.slice(image.indexOf(',') + 1).replace(/\s/g, '+');
    const buff = Buffer.from(data, 'base64');

    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath);

    fs.writeFileSync(`${dirPath}/${drawingId}.jpg`, buff);

    console.log('file saved');
    res.status(200).json({ message: 'success' });
  }
}
