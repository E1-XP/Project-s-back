import Sequelize, { Model, SequelizeStaticAndInstance, SequelizeStatic } from 'sequelize';

export const sequelize = new Sequelize("project-s", "root", "", {
    host: "127.0.0.1",
    dialect: "mysql"
});

interface Models {
    User: Sequelize.Model<{}, {}>,
}

interface DB {
    models: Models,
    Sequelize: SequelizeStatic,
    sequelize: any
}

const db: DB = {
    models: {
        User: sequelize.import('./user')
    },
    Sequelize,
    sequelize
}

// Object.keys(db.models).forEach((key: string) => {
//     if ('associate' in db.models[key]) {
//         db.models[key].associate(db.models);
//     }
// });

export default db;