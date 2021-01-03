import http from "http";
import { Client, generateId } from "colyseus";

import { ArenaState } from "./ArenaState";
import { Player } from "./Player";
import logger, { LogCodes } from '../../utils/logger';
import constants from "../../utils/constants";
import { distance, normalize } from '../../utils/vector';
import { circle } from '../../utils/collision';
import { Rocket } from "./Rocket";

const onInit = (state: ArenaState) => {
  logger.info("Arena room created.", LogCodes.ARENA_ROOM);
}

const onTick = (state: ArenaState, delta: number): void => {
  state.players.forEach((player, sessionId) => {
    onPlayerUpdate(sessionId, player, delta);
  });

  state.players.forEach((player, sessionId) => {
    if (player.dead) {
      state.players.delete(sessionId);
    }
  });

  if (state.rockets.size > 0) {
    state.rockets.forEach((rocket, rocketId) => {
      if (rocket.active) {
        onRocketUpdate(state, rocketId);
      }
    });

    state.rockets.forEach((rocket, rocketId) => {
      if (!rocket.active || state.players.size === 0) {
        state.rockets.delete(rocketId);
      }
    });
  }
};

const onPlayerAuth = (client: Client, options: any, request: http.IncomingMessage): boolean => {
  return !!options.name;
};

const onPlayerJoin = (state: ArenaState, client: Client, options: any) => {
  logger.info("Player joined room.", LogCodes.SERVER_PLAYER, { sessionId: client.sessionId });

  state.players.set(client.sessionId, new Player().assign({
    x: Math.random() * state.width,
    y: Math.random() * state.height,
    name: options.name
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
  const speed = constants.DEFAULT_PLAYER_SPEED; // * delta;

  let dir = { x: 0, y: 0 };

  if (player.isUpPressed === true) {
    dir.y = -2;
  }
  else if (player.isDownPressed === true) {
    dir.y = 2;
  }

  if (player.isLeftPressed === true) {
    dir.x = -2;
  }
  else if (player.isRightPressed === true) {
    dir.x = 2;
  }

  dir = normalize(dir.x, dir.y);

  player.x += speed * dir.x;
  player.y += speed * dir.y;

  const minBounds = constants.DEFAULT_PLAYER_RADIUS;
  const maxBounds = constants.WORLD_SIZE - constants.DEFAULT_PLAYER_RADIUS;

  if (player.y < minBounds) { player.y = minBounds; }
  if (player.y > maxBounds) { player.y = maxBounds; }

  if (player.x < minBounds) { player.x = minBounds; }
  if (player.x > maxBounds) { player.x = maxBounds; }
};

const onRocketSpawn = (state: ArenaState): void => {
  logger.info('Attempting to spawn one rocket', LogCodes.SERVER_ROCKET);
  if (state.players.size > 0) {
    const rocketId = generateId();
    const targetId = getRandomPlayerId(state);
    logger.info('Rocket has got target of', LogCodes.SERVER_ROCKET, { rocketId, targetId });
    state.rockets.set(rocketId, new Rocket().assign({
      x: constants.WORLD_SIZE / 2,
      y: constants.WORLD_SIZE / 2,
      active: true,
      targetId,
    }));
  } else {
    logger.error('Unable to spawn rocket as there is no players.', LogCodes.SERVER_ROCKET)
  }
};

const onRocketUpdate = (state: ArenaState, rocketId: string): void => {
  const speed = constants.DEFAULT_ROCKET_START_SPEED;
  const rocket = state.rockets.get(rocketId);

  const targetId = rocket.targetId;
  if (!targetId) {
    logger.error('Rocket does not have a populated target', LogCodes.SERVER_ROCKET, { rocketId });
    return;
  }

  const targetPlayer = state.players.get(targetId);
  if (!targetPlayer) {
    logger.error('Rocket target id does not point to a existing player', LogCodes.SERVER_ROCKET, { rocketId, targetId });
    return;
  }

  const dir = normalize(targetPlayer.x - rocket.x, targetPlayer.y - rocket.y);
  rocket.x += speed * dir.x;
  rocket.y += speed * dir.y;

  if (distance(rocket.x, rocket.y, targetPlayer.x, targetPlayer.y) < 1) {
    rocket.x = targetPlayer.x;
    rocket.y = targetPlayer.y;
  }

  const collided = circle(rocket.x, rocket.y, rocket.radius, targetPlayer.x, targetPlayer.y, targetPlayer.radius);
  if (collided) {
    const newTargetId = getRandomPlayerId(state, [targetId]);
    if (newTargetId) {
      rocket.assign({ targetId: newTargetId });
    } else {
      logger.error('Unable to get new target for rocket, destorying rocket', LogCodes.SERVER_ROCKET, { rocketId });
      rocket.assign({active: false});
    }
  }
};

const getRandomPlayerId = (state: ArenaState, exclude: Array<string> = []): string => {
  const filteredPlayerIds = [...state.players.keys()].filter((id) => !exclude.includes(id));
  const randomIndex = Math.floor(Math.random() * (state.players.size - exclude.length));
  return filteredPlayerIds[randomIndex];
}

export {
  onInit,
  onPlayerAuth,
  onPlayerJoin,
  onPlayerLeave,
  onPlayerUpdate,
  onTick,
  onRocketSpawn,
  onRocketUpdate
  };