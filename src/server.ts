import * as dotenv from "dotenv";
dotenv.config();

import { app } from "./app";
import db from "./models";
import redis from "redis";

import redisConfig from "./../config/redis";

const PORT: string | number = process.env.PORT || 3001;

import initSocket from "./socket";

(async () => {
  await db.sequelize.sync();

  const redisDB = redis.createClient(redisConfig.port!, redisConfig.host!);
  redisDB.auth(redisConfig.password!);

  const server = app.listen(PORT, () => console.log(`Listening on ${PORT}`));

  redisDB.on("connect", () => console.log("redis client connected."));
  redisDB.on("error", err => console.log("redis error: ", err));

  initSocket(server, redisDB);
})().catch((err: any) => console.log(err));
