let webpack, webpackDevMiddleware, webpackHotMiddleware, webpackConfig;
if (process.env.NODE_ENV !== "production") {
  webpack = require("webpack");
  webpackDevMiddleware = require("webpack-dev-middleware");
  webpackConfig = require("../../webpack.config");
  webpackHotMiddleware = require("webpack-hot-middleware");
}

import { Server } from "colyseus";
import http from "http";
import express from "express";
import path from "path";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";

import { ArenaRoom } from "./rooms/ArenaRoom";
import constants from "../utils/constants";

const app = express();
const port = Number(process.env.PORT || 8080);
const endpoint = "localhost";

let STATIC_DIR: string;

const gameServer = new Server({
  server: http.createServer(app),
  express: app
});

if (process.env.NODE_ENV !== "production") {
  const webpackCompiler = webpack(webpackConfig({}));
  app.use(webpackDevMiddleware(webpackCompiler, {}));
  app.use(webpackHotMiddleware(webpackCompiler));

  // on development, use "../../" as static root
  STATIC_DIR = path.resolve(__dirname, "..", "..");

} else {
  // on production, use ./public as static root
  STATIC_DIR = path.resolve(__dirname, "public");
}

app.use(cookieParser());
app.use(express.json());
app.use("/", express.static(STATIC_DIR));

app.post('/login', (req, res) => {
  console.log(req.body);
  const token = jwt.sign({ name: 'john' }, 'SECRET_SALT', { expiresIn: (60 * 60) * 6 });
  res.cookie('client-ident', token, {
    secure: false,
    httpOnly: true
  });
  res.send({ success: true });
});

gameServer.define(constants.ROOM_NAME, ArenaRoom);
gameServer.listen(port);

if (process.env.NODE_ENV !== "production") {
  // const latencyOffset = Math.floor(Math.random() * 40);
  // gameServer.simulateLatency(100 - latencyOffset);
  gameServer.simulateLatency(30);
}

console.log(`Listening on http://${endpoint}:${port}`);
