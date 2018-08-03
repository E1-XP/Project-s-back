import Sequelize, { SequelizeStatic, Sequelize as ISequelize } from 'sequelize';

export const sequelize = new Sequelize("dbprojects", "dbprojects", "Cx2yM!t4J-ET", {
    host: "den1.mysql2.gear.host",
    dialect: "mysql"
});

interface Models {
    [key: string]: any;
    User: Sequelize.Model<{}, {}>,
    Drawing: Sequelize.Model<{}, {}>,
    DrawingPoints: Sequelize.Model<{}, {}>
    Room: Sequelize.Model<{}, {}>
}

interface DB {
    models: Models,
    Sequelize: SequelizeStatic,
    sequelize: ISequelize
}

const db: DB = {
    models: {
        User: sequelize.import('./user'),
        Drawing: sequelize.import('./drawing'),
        DrawingPoints: sequelize.import('./drawingpoints'),
        Room: sequelize.import('./room')
    },
    Sequelize,
    sequelize
}

Object.keys(db.models).forEach((key) => {
    if ('associate' in db.models[key]) {
        db.models[key].associate(db.models);
    }
});

export default db;
