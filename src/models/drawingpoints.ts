import { Sequelize, DataTypes, Model, Instance } from 'sequelize';

export interface DrawingPoint {
  x: number;
  y: number;
  fill: string;
  weight: number;
  date: number;
  group: number;
  userId: number;
  drawingId: number;
  id?: number;
  archived?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface DrawingPointsModel
  extends Model<DrawingPointsInstance, DrawingPoint> {}

export interface DrawingPointsInstance
  extends Instance<DrawingPoint>,
    DrawingPoint {}

const DrawingPoints = function(sequelize: Sequelize, DataTypes: DataTypes) {
  const _DrawingPoints = sequelize.define<DrawingPointsInstance, DrawingPoint>(
    'drawingpoints',
    {
      x: DataTypes.INTEGER,
      y: DataTypes.INTEGER,
      fill: DataTypes.STRING,
      weight: DataTypes.INTEGER,
      date: DataTypes.BIGINT,
      group: DataTypes.INTEGER,
      userId: DataTypes.INTEGER,
      drawingId: DataTypes.INTEGER,
    },
  );

  return _DrawingPoints;
};

export default DrawingPoints;
