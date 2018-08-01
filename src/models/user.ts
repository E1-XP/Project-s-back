import bcrypt from 'bcrypt';
import { Sequelize, DataTypes } from 'sequelize';

export interface UserType {
    id?: string;
    username: string;
    email: string;
    password: string;
    archived?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

const User = function (sequelize: Sequelize, DataTypes: DataTypes) {
    const _User = sequelize.define('user', {
        username: {
            type: DataTypes.STRING
        },
        email: {
            type: DataTypes.STRING,
            unique: true
        },
        password: {
            type: DataTypes.STRING
        }
    });

    _User.associate = models => {
        _User.belongsToMany(models.Drawing, {
            through: 'usersindrawings',
            foreignKey: 'userId'
        });
    };

    _User.beforeCreate(async function (user: any): Promise<void> {
        const hashedPass = await bcrypt.hash(user.password, 10);
        user.password = hashedPass;
    });

    _User.beforeUpdate(async function (user: any): Promise<void> {
        const hashedPass = await bcrypt.hash(user.password, 10);
        user.password = hashedPass;
    });

    return _User;
}

export default User;
