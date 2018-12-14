import { Sequelize, Model, DataTypes, Instance } from "sequelize";

export interface IInvitation {
  id?: number;
  roomId: number;
  senderId: number;
  senderName: string;
  receiverId: number;
  archived?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface DrawingModel extends Model<InvitationInstance, IInvitation> {}

export interface InvitationInstance
  extends Instance<IInvitation>,
    IInvitation {}

const Invitation = function(sequelize: Sequelize, DataTypes: DataTypes) {
  const _Invitation = sequelize.define<InvitationInstance, IInvitation>(
    "invitation",
    {
      roomId: DataTypes.BIGINT,
      senderId: DataTypes.INTEGER,
      senderName: DataTypes.STRING,
      receiverId: DataTypes.INTEGER
    }
  );

  return _Invitation;
};

export default Invitation;
