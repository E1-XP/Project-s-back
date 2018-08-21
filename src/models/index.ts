import Sequelize, { SequelizeStatic, Sequelize as ISequelize } from 'sequelize';

import { IDrawing, DrawingInstance } from "./drawing";
import { UserInstance, UserType } from "./user";
import { PointsGroup, DrawingPointsInstance } from "./drawingpoints";
import { Room, RoomInstance } from "./room";
import { Message, MessageInstance } from "./message";
import { IInvitation, InvitationInstance } from "./invitation";

export const sequelize = new Sequelize("project-s", "root", "", {
    host: "127.0.0.1",
    dialect: "mysql"
});

interface Models {
    [key: string]: any;
    User: Sequelize.Model<UserInstance, UserType>;
    Drawing: Sequelize.Model<DrawingInstance, IDrawing>;
    DrawingPoints: Sequelize.Model<DrawingPointsInstance, PointsGroup>;
    Room: Sequelize.Model<RoomInstance, Room>;
    Message: Sequelize.Model<MessageInstance, Message>;
    Invitation: Sequelize.Model<IInvitation, InvitationInstance>;
}

interface DB {
    models: Models,
    Sequelize: SequelizeStatic,
    sequelize: ISequelize
}

const db: DB = {
    models: {
        User: sequelize.import('./user'),
        Drawing: sequelize.import('./drawing'),
        DrawingPoints: sequelize.import('./drawingpoints'),
        Room: sequelize.import('./room'),
        Message: sequelize.import('./message'),
        Invitation: sequelize.import('./invitation')
    },
    Sequelize,
    sequelize
};

Object.keys(db.models).forEach((key) => {
    if ('associate' in db.models[key]) {
        db.models[key].associate(db.models);
    }
});

export default db;
