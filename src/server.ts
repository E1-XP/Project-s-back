import * as dotenv from "dotenv";
dotenv.config();

import { app } from "./app";
import db from "./models";
import { redisDB } from "./models/redis";

const PORT = +process.env.PORT! || 3001;

import { initSocket } from "./socket";

(async () => {
  await db.sequelize.sync();
  const server = app.listen(PORT, () => console.log(`Listening on ${PORT}`));

  initSocket(server, redisDB);
})().catch((err: any) => console.log(err));
