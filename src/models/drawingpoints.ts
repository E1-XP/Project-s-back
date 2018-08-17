import { Sequelize, DataTypes, Model, Instance } from 'sequelize';

export interface PointsGroup {
    id?: number;
    name: string;
    userId: number;
    count: number;
    arrayGroup: number;
    x: number;
    y: number;
    fill: string;
    weight: number;
    drawingId: number;
    archived?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface DrawingPointsModel extends Model<DrawingPointsInstance, PointsGroup> { }

export interface DrawingPointsInstance extends Instance<PointsGroup>, PointsGroup { }

const DrawingPoints = function (sequelize: Sequelize, DataTypes: DataTypes) {
    const _DrawingPoints = sequelize.define<DrawingPointsInstance, PointsGroup>('drawingpoints', {
        name: DataTypes.STRING,
        userId: DataTypes.INTEGER,
        count: DataTypes.INTEGER,
        arrayGroup: DataTypes.INTEGER,
        x: DataTypes.INTEGER,
        y: DataTypes.INTEGER,
        fill: DataTypes.STRING,
        weight: DataTypes.INTEGER
    });

    return _DrawingPoints;
}

export default DrawingPoints;
