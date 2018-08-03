import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express-serve-static-core';

import db from '../models';

import { PointsGroup } from '../models/drawingpoints';

export interface DrawingController {

}

export class DrawingController implements DrawingController {
    getRoomDrawingPoints = async (roomId: string) => {
        const RoomDrawingPoints = await db.models.DrawingPoints
            .findAll({ where: { roomId } });

        return RoomDrawingPoints;
    }

    savePointsGroup = async (data: PointsGroup[]) => {
        console.log('RECEIVED DATA:', data);
        await db.models.DrawingPoints.bulkCreate(data);
    }

    saveAsJPEG = (req: Request, res: Response) => {
        const { roomid } = req.params;
        const { image } = req.body;
        const dirPath = path.join(__dirname, `../public/images/${roomid}`);

        image.replace(/^data:image\/\w+;base64,/, "");
        const data = image.slice(image.indexOf(',') + 1).replace(/\s/g, '+');
        const buff = Buffer.from(data, 'base64');

        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath);

            fs.writeFile(dirPath + '/drawing.jpg', buff, (err) => {
                if (err) console.log(err);
                else console.log('file saved');
            });
        }
    }

    resetDrawing = async (roomId: string) => {
        await db.models.DrawingPoints.destroy({ where: { roomId } });
    }
}
