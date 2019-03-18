import "reflect-metadata";

import { InversifyExpressServer } from "inversify-express-utils";
import { container } from "./container";

import express from "express";
import path from "path";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import cors from "cors";
import compression from "compression";

import "./controllers";

const ORIGIN_URL = "http://localhost:8080";

const corsConfig = {
  origin: ORIGIN_URL,
  credentials: true
};

const server = new InversifyExpressServer(container);

server.setConfig(app => {
  app.use(morgan("dev"));
  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());
  app.use(bodyParser.json());
  app.use(cors(corsConfig));

  app.use("/static", express.static(path.join(__dirname, "../public")));
});

export const app = server.build();
