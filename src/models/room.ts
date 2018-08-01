import { Sequelize, DataTypes } from 'sequelize';

const Room = function (sequelize: Sequelize, DataTypes: DataTypes) {
    const _Room = sequelize.define('room', {
        name: DataTypes.STRING,
        roomId: DataTypes.BIGINT,
        adminId: DataTypes.INTEGER
    });

    return _Room;
};

export default Room;
