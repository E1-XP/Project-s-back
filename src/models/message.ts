import { Sequelize, DataTypes, Model, Instance } from 'sequelize';
import { UserType } from './user';

export interface Message {
  id?: number;
  authorId: number;
  author: string;
  message: string;
  roomId?: number | null;
  isGeneral: boolean;
  archived?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface MessageModel extends Model<MessageInstance, Message> {}

export interface MessageInstance extends Instance<Message>, Message {}

const Message = function(sequelize: Sequelize, DataTypes: DataTypes) {
  const _Message = sequelize.define<MessageModel, MessageInstance>(
    'message',
    {
      authorId: DataTypes.INTEGER,
      author: DataTypes.STRING,
      message: DataTypes.STRING,
      roomId: DataTypes.BIGINT,
      isGeneral: DataTypes.BOOLEAN,
    },
    {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
    },
  );

  _Message.associate = models => {
    _Message.hasOne(models.User, {
      foreignKey: 'id',
    });
  };

  return _Message;
};

export default Message;
