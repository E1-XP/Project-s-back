import { Sequelize, DataTypes, Model, Instance } from 'sequelize';

export interface Room {
    id?: number;
    name: string;
    roomId?: number;
    adminId: number;
    isPrivate: boolean;
    password: string | null;
    [key: string]: any;
    archived?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface RoomModel extends Model<RoomInstance, Room> { }

export interface RoomInstance extends Instance<Room>, Room { }

const Room = function (sequelize: Sequelize, DataTypes: DataTypes) {
    const _Room = sequelize.define<RoomModel, RoomInstance>('room', {
        name: DataTypes.STRING,
        roomId: DataTypes.BIGINT,
        adminId: DataTypes.INTEGER,
        isPrivate: DataTypes.BOOLEAN,
        password: DataTypes.STRING
    });

    return _Room;
};

export default Room;
