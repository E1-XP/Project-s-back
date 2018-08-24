import db from './../models';

import { Request, Response } from 'express-serve-static-core';

export class UserController {
    getUsers = async (params?: any) => {
        try {
            const users = await db.models.User.findAll({ where: params || {} });

            return users;
        }
        catch (err) {
            console.log(err);
        }
    }

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

    getInboxMessages = async (req: Request, res: Response) => {
        const { userid } = req.params;

        try {
            const messages = await db.models.Invitation
                .findAll({ where: { receiverId: userid } });

            res.status(200).json({ messages });

        } catch (err) {
            res.status(500).json({ message: 'internal server error' });
        }
    }

    getInboxData = async (userId: number) => {
        try {
            const messages = await db.models.Invitation
                .findAll({
                    where: { receiverId: userId },
                    order: [['id', 'DESC']]
                });

            return messages;
        }
        catch (err) {
            console.log(err);
        }
    }

    updateInboxData = async (data: any) => {
        try {
            const { receiverId } = data;

            const message = await db.models.Invitation.create(data);

            const messages = await db.models.Invitation.findAll({
                where: { receiverId },
                order: [['id', 'DESC']]
            });

            return messages;

        } catch (err) {
            console.log(err);
        }
    }
}
