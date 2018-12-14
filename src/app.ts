import "reflect-metadata";
import { InversifyExpressServer } from "inversify-express-utils";
import { container } from "./container";

import express from "express";
import path from "path";
import morgan from "morgan";
import bodyParser from "body-parser";
import cors from "cors";
import compression from "compression";
import session from "client-sessions";

import "./controllers";

const ORIGIN_URL = "http://localhost:8080";

const corsConfig = {
  origin: ORIGIN_URL,
  credentials: true
};

const sessionConfig = {
  cookieName: "session",
  secret: String(process.env.SECRET_KEY),
  duration: 1000 * 60 * 60 * 8, //8h
  cookie: {
    ephemeral: true,
    httpOnly: true
  }
};

const server = new InversifyExpressServer(container);

server.setConfig(app => {
  app.use(morgan("dev"));
  app.use(compression());
  app.use(bodyParser.json());
  app.use(cors(corsConfig));
  app.use(session(sessionConfig));

  app.use("/static", express.static(path.join(__dirname, "../public")));
});

const app = server.build();

export { app };
