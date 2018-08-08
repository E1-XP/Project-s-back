import db from './../models';

import { Request, Response } from 'express-serve-static-core';

import { IDrawing } from "../models/drawing";
import { UserType } from '../models/user';

export class UserController {
    getDrawings = async (req: Request, res: Response) => {
        const { userid } = req.params;

        try {
            const dbResp: any = await db.models.User
                .findAll({
                    include: [{ model: db.models.Drawing }],
                    where: { id: userid }
                });

            const drawings = dbResp[0].drawings;

            res.status(200).json({ drawings: drawings });
        }
        catch (err) {
            console.log(err);
            res.status(500).json({ message: 'internal server error' });
        }
    }

    createDrawing = async (req: Request, res: Response) => {
        const { name, userId } = req.body;

        try {
            const drawing = await db.models.Drawing.create({
                name,
                creatorId: userId
            });

            drawing.addUser(userId);

            //return user drawings
            const dbResp: any = await db.models.User
                .findAll({
                    include: [{ model: db.models.Drawing }],
                    where: { id: userId }
                });

            const drawings = dbResp[0].drawings;

            res.status(200).json({
                currentId: drawing.id,
                drawings
            });
        }
        catch (err) {
            console.log(err);
            res.status(500).json({ message: 'internal server error' });
        }
    }

    addDrawingOwner = (req: Request, res: Response) => {
        const { userId } = req.body;

        // await db.
    }
}
