import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express-serve-static-core';

import db from '../models';

import { PointsGroup, DrawingPointsInstance } from '../models/drawingpoints';

export interface IDrawingController {
    getRoomDrawingPoints: (v: number) => Promise<DrawingPointsInstance[]>;
    savePointsGroup: (data: PointsGroup[]) => Promise<any>;
    saveAsJPEG: (req: Request, res: Response) => void;
    resetDrawing: (v: number) => Promise<any>;
}

export class DrawingController implements IDrawingController {
    getRoomDrawingPoints = async (drawingId: number) => {
        const RoomDrawingPoints = await db.models.DrawingPoints
            .findAll({ where: { drawingId } });

        return RoomDrawingPoints;
    }

    savePointsGroup = async (data: PointsGroup[]) => {
        console.log('RECEIVED DATA:', data);
        await db.models.DrawingPoints.bulkCreate(data);
    }

    saveAsJPEG = (req: Request, res: Response) => {
        const { roomid } = req.params;
        const { image, drawingId } = req.body;

        const dirPath = path.join(__dirname, `../../public/images`);

        image.replace(/^data:image\/\w+;base64,/, "");
        const data = image.slice(image.indexOf(',') + 1).replace(/\s/g, '+');
        const buff = Buffer.from(data, 'base64');

        if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath);

        fs.writeFileSync(`${dirPath}/${drawingId}.jpg`, buff);
        console.log('file saved');
    }

    resetDrawing = async (drawingId: number) => {
        await db.models.DrawingPoints.destroy({ where: { drawingId } });
    }
}
