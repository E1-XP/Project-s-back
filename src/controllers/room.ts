import db from '../models';

import { Room } from '../models/room';

// interface RoomModel {
//     dataValues: RoomCreateData;
// }

export interface RoomController {
    getAll: () => Promise<Room[]>;
    create: (v: Room) => Promise<Room>;
    delete: (v: string) => Promise<void>;
}

export class RoomController implements RoomController {
    getAll = async () => {

        const allRooms = <Room[]>await db.models.Room.findAll({});

        return <Room[]>allRooms.map(itm =>

            Object.keys(itm.dataValues).reduce((acc: any, key) => {
                if (key !== 'password') acc[key] = itm.dataValues[key];
                return acc;
            }, {}));
    }

    create = async (data: Room) => {
        const { name, adminId, isPrivate, password } = data;

        const roomCreated = <Room>await db.models.Room.create({
            name,
            adminId,
            roomId: Date.now(),
            password,
            isPrivate
        });

        return <Room>Object.keys(roomCreated).reduce((acc: any, key) => {
            if (key !== 'password') acc[key] = roomCreated[key];
            return acc;
        }, {});
    }

    delete = async (roomId: string) => {
        await db.models.Room.destroy({
            where: { roomId }
        });
    }
}
