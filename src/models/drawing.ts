import {
  Sequelize,
  Model,
  DataTypes,
  Instance,
  HasManyAddAssociationMixin,
} from 'sequelize';

import { UserType } from './user';

export interface IDrawing {
  id?: number;
  name: string;
  creatorId: number;
  archived?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface DrawingModel extends Model<DrawingInstance, IDrawing> {}

export interface DrawingInstance extends Instance<IDrawing>, IDrawing {
  addUser: HasManyAddAssociationMixin<UserType, string>;
}

const Drawing = function(sequelize: Sequelize, DataTypes: DataTypes) {
  const _Drawing = sequelize.define<DrawingInstance, IDrawing>('drawing', {
    name: DataTypes.STRING,
    creatorId: DataTypes.INTEGER,
  });

  _Drawing.associate = models => {
    _Drawing.belongsToMany(models.User, {
      through: 'usersindrawings',
      foreignKey: 'drawingId',
    });
    _Drawing.hasMany(models.DrawingPoints, {
      foreignKey: 'drawingId',
    });
  };

  return _Drawing;
};

export default Drawing;
