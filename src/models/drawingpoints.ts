import { Sequelize, DataTypes } from 'sequelize';

export interface PointsGroup {
    name: string;
    roomId: number;
    userId: number;
    count: number;
    arrayGroup: number;
    x: number;
    y: number;
    fill: string;
    weight: number;
}

const DrawingPoints = function (sequelize: Sequelize, DataTypes: DataTypes) {
    const _DrawingPoints = sequelize.define('drawingpoints', {
        name: DataTypes.STRING,
        roomId: DataTypes.BIGINT,
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
