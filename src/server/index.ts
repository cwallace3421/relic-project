const isDevelopment = ():boolean => process.env.NODE_ENV !== "production";

// let webpack, webpackDevMiddleware, webpackHotMiddleware, webpackConfig;
// if (isDevelopment) {
//   webpack = require("webpack");
//   webpackDevMiddleware = require("webpack-dev-middleware");
//   webpackConfig = require("../../webpack.config");
//   webpackHotMiddleware = require("webpack-hot-middleware");
// }

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

const gameServer = new Server({
  server: http.createServer(app)
});

if (isDevelopment()) {
  const webpack = require("webpack");
  const webpackDevMiddleware = require("webpack-dev-middleware");
  const webpackConfig = require("../../webpack.config");
  const webpackHotMiddleware = require("webpack-hot-middleware");
  const webpackCompiler = webpack(webpackConfig({}));

  app.use(webpackDevMiddleware(webpackCompiler, {}));
  app.use(webpackHotMiddleware(webpackCompiler));
}

app.use(cookieParser());
app.use(express.json());

if (isDevelopment()) {
  // on development, use "../../" as static root
  app.use("/", express.static(path.resolve(__dirname, "..", "..")));

  // on development, set simulated latency for game server
  gameServer.simulateLatency(constants.SIMULATED_LATENCY);
} else {
  // on production, use ./public as static root
  app.use("/", express.static(path.resolve(__dirname, "..", "..", "public")));
  // on production, use ../assets as static root
  app.use("/assets", express.static(path.resolve(__dirname, "..", "..", "..", "assets")));

  // on production, serve index html file on root
  app.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, "..", "..", "public", 'index.html'));
  });
}

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

console.log(`Listening on http://${endpoint}:${port}`);
