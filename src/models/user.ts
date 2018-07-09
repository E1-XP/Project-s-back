import bcrypt from 'bcrypt';
import { SequelizeStatic, Sequelize } from 'sequelize';

export interface UserType {
    id?: string;
    username: string;
    email: string;
    password: string;
    archived?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

const User = function (sequelize: Sequelize, Sequelize: SequelizeStatic) {
    const _User = sequelize.define('User', {
        username: {
            type: Sequelize.STRING
        },
        email: {
            type: Sequelize.STRING,
            unique: true
        },
        password: {
            type: Sequelize.STRING
        }
    });

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