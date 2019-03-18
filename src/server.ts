import * as dotenv from "dotenv";
dotenv.config();

import { app } from "./app";
import db from "./models";
import { redisDB } from "./models/redis";

import { SocketInitializer } from "./socket";

const PORT = +process.env.PORT! || 3001;

(async () => {
  await db.sequelize.sync();
  const server = app.listen(PORT, () => console.log(`Listening on ${PORT}`));

  const socket = new SocketInitializer(server, redisDB);
})().catch((err: any) => console.log(err));
