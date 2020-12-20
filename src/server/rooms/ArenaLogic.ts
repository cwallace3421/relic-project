import http from "http";
import { Client } from "colyseus";

import { ArenaState } from "./ArenaState";
import { Player } from "./Player";
import logger, { LogCodes } from '../../utils/logger';

const WORLD_SIZE = 500;
const DEFAULT_PLAYER_SPEED = 1;
const DEFAULT_PLAYER_RADIUS = 10;

const onInit = (state: ArenaState) => {
  logger.info("Arena room created.", LogCodes.ARENA_ROOM);
}

const onPlayerAuth = (client: Client, options: any, request: http.IncomingMessage): boolean => {
  return true;
};

const onPlayerJoin = (state: ArenaState, client: Client, options: any) => {
  logger.info("Player joined room.", LogCodes.SERVER_PLAYER, { sessionId: client.sessionId });

  state.players.set(client.sessionId, new Player().assign({
    x: Math.random() * state.width,
    y: Math.random() * state.height
  }));
};

const onPlayerLeave = (state: ArenaState, client: Client) => {
  const player = state.players.get(client.sessionId);
  if (player) {
    logger.info("Player left room.", LogCodes.SERVER_PLAYER, { sessionId: client.sessionId });
    player.dead = true;
  }
};

const onPlayerUpdate = (sessionId: string, player: Player, delta: number): void => {
  const speed = DEFAULT_PLAYER_SPEED;// * delta;
    // console.log(speed);

    if (player.isUpPressed === true) {
      player.y -= speed;
    }
    else if (player.isDownPressed === true) {
      player.y += speed;
    }

    if (player.isLeftPressed === true) {
      player.x -= speed;
    }
    else if (player.isRightPressed === true) {
      player.x += speed;
    }

    const minBounds = DEFAULT_PLAYER_RADIUS;
    const maxBounds = WORLD_SIZE - DEFAULT_PLAYER_RADIUS;

    if (player.y < minBounds) { player.y = minBounds; }
    if (player.y > maxBounds) { player.y = maxBounds; }

    if (player.x < minBounds) { player.x = minBounds; }
    if (player.x > maxBounds) { player.x = maxBounds; }
};

const onTick = (state: ArenaState, delta: number): void => {
  state.players.forEach((player, sessionId) => {
    onPlayerUpdate(sessionId, player, delta);
  });

  state.players.forEach((player, sessionId) => {
    if (player.dead) {
      state.players.delete(sessionId);
    }
  });
};

export { onInit, onPlayerAuth, onPlayerJoin, onPlayerLeave, onPlayerUpdate, onTick };