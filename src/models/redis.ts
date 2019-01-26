import redis from "redis";
const asyncRedis = require("async-redis");

import redisConfig from "./../../config/redis";

export const redisDB = redis.createClient(redisConfig.port!, redisConfig.host!);
redisDB.auth(redisConfig.password!);

asyncRedis.decorate(redisDB);

redisDB.on("connect", () => console.log("redis client connected."));
redisDB.on("error", err => console.log("redis error: ", err));
