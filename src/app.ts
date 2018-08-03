import * as dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import redis from 'redis';
import morgan from "morgan";
import bodyParser from 'body-parser';
import cors from 'cors';
import compression from 'compression';
import session from 'client-sessions';

const PORT: string | number = process.env.PORT || 3001;
export const app = express();

import routes from './routes';
import db from './models';
import initSocket from './socket';

//app.use(morgan("combined"));
app.use(compression());
app.use(bodyParser.json());
app.use(cors({
    origin: 'http://localhost:8080',
    credentials: true
}));

const sessionConfig = {
    cookieName: 'session',
    secret: String(process.env.SECRET_KEY),
    duration: 1000 * 60 * 60 * 8, //8h
    cookie: {
        ephemeral: true,
        httpOnly: true
    }
};
app.use(session(sessionConfig));

app.use('/static', express.static(path.join(__dirname, 'public')));

app.use('/', routes);

const host = 'redis-17443.c8.us-east-1-2.ec2.cloud.redislabs.com';
const port = 17443;
const password = 'z5FbgMgk8fTmbpt2KdXm9qsMw276skm4';

(async () => {
    await db.sequelize.sync();

    const redisDB = redis.createClient(port, host);
    redisDB.auth(password);

    const server = app.listen(PORT, () => console.log(`Listening on ${PORT}`));

    redisDB.on('connect', () => console.log('redis client connected.'));
    redisDB.on('error', (err) => console.log('redis error: ', err));

    initSocket(server, redisDB);
})();
