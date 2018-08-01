import db from '../models';

export interface CreateData {
    name: string;
    adminId: number;
}

export interface RoomController {
    getAll: () => Promise<any>;
    create: (v: CreateData) => Promise<any>;
    delete: (v: string) => Promise<void>;
}

export class RoomController implements RoomController {
    getAll = async () => {
        const allRooms: any = await db.models.Room.findAll({});
        return allRooms;
    }

    create = async (data: CreateData) => {
        const { name, adminId } = data;

        const newRoom: any = await db.models.Room.create({
            name, adminId, roomId: Date.now()
        });

        return newRoom;
    }

    delete = async (roomId: string) => {
        await db.models.Room.destroy({
            where: { roomId }
        });
    }
}
