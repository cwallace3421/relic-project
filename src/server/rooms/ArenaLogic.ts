import http from "http";
import { Client, generateId } from "colyseus";

import { ArenaState } from "./ArenaState";
import { Player } from "./Player";
import logger, { LogCodes } from '../../utils/logger';
import constants from "../../utils/constants";
import { distance, normalize } from '../../utils/vector';
import { circle } from '../../utils/collision';
import { getRandomBotName } from '../../utils/botnames';
import { Rocket } from "./Rocket";
import { Bot } from "./Bot";

const onInit = (state: ArenaState) => {
  logger.info("Arena room created.", LogCodes.ARENA_ROOM);

  if (constants.BOT_ENABLED) {
    for (let i = 0; i < constants.BOT_COUNT; i++) {
      onBotSpawn(state);
    }
  }
}

const onTick = (state: ArenaState, delta: number): void => {
  // const deltaTime: number = delta / 1000;
  const deltaTime: number = constants.SIMULATION_TICK_RATE / 1000;

  state.players.forEach((player, sessionId) => {
    onPlayerUpdate(sessionId, player, deltaTime);
  });

  state.players.forEach((player, sessionId) => {
    if (player.dead) {
      state.players.delete(sessionId);
    }
  });

  if (state.rockets.size > 0) {
    state.rockets.forEach((rocket, rocketId) => {
      if (rocket.active) {
        onRocketUpdate(state, rocketId, deltaTime);
      }
    });

    state.rockets.forEach((rocket, rocketId) => {
      if (!rocket.active || state.players.size === 0) {
        state.rockets.delete(rocketId);
      }
    });
  }

  if (constants.BOT_ENABLED) {
    state.bots.forEach((bot, botId) => {
      onBotUpdate(state, botId, deltaTime);
    })
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
    name: options.name,
    speed: constants.PLAYER_SPEED,
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
  const speed = player.speed * delta;

  let dir = { x: 0, y: 0 };

  if (player.isUpPressed === true) {
    dir.y = -1;
  }
  else if (player.isDownPressed === true) {
    dir.y = 1;
  }

  if (player.isLeftPressed === true) {
    dir.x = -1;
  }
  else if (player.isRightPressed === true) {
    dir.x = 1;
  }

  if (dir.x === 0 && dir.y === 0) {
    return;
  }

  // console.log('pixels per second: ', (speed * 60));

  dir = normalize(dir.x, dir.y);

  player.x += speed * dir.x;
  player.y += speed * dir.y;

  const minBounds = player.radius;
  const maxBounds = constants.WORLD_SIZE - player.radius;

  if (player.y < minBounds) { player.y = minBounds; }
  if (player.y > maxBounds) { player.y = maxBounds; }

  if (player.x < minBounds) { player.x = minBounds; }
  if (player.x > maxBounds) { player.x = maxBounds; }
};

const onRocketSpawn = (state: ArenaState): void => {
  logger.info('Attempting to spawn one rocket.', LogCodes.SERVER_ROCKET);
  if (state.players.size > 0) {
    const rocketId = generateId();
    const targetId = getRandomPlayerId(state);
    logger.info('Rocket has got target.', LogCodes.SERVER_ROCKET, { rocketId, targetId });
    state.rockets.set(rocketId, new Rocket().assign({
      x: constants.WORLD_SIZE / 2,
      y: constants.WORLD_SIZE / 2,
      active: true,
      targetId,
      speed: constants.ROCKET_SPEED,
    }));
  } else {
    logger.error('Unable to spawn rocket as there is no players.', LogCodes.SERVER_ROCKET)
  }
};

const onRocketUpdate = (state: ArenaState, rocketId: string, delta: number): void => {
  const rocket = state.rockets.get(rocketId);
  const speed = rocket.speed * delta;

  const targetId = rocket.targetId;
  if (!targetId) {
    logger.error('Rocket does not have a populated target.', LogCodes.SERVER_ROCKET, { rocketId });
    return;
  }

  const targetPlayer = state.players.get(targetId);
  if (!targetPlayer) {
    logger.error('Rocket target id does not point to a existing player.', LogCodes.SERVER_ROCKET, { rocketId, targetId });
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
      logger.error('Unable to get new target for rocket, destorying rocket.', LogCodes.SERVER_ROCKET, { rocketId });
      rocket.assign({active: false});
    }
  }
};

const onBotSpawn = (state: ArenaState) => {
  const difficulty = Math.floor(Math.random() * 8);
  const botId = generateId();
  const botName = getRandomBotName(` (D:${difficulty})`);

  logger.info("Bot joined room.", LogCodes.SERVER_BOT, { botId, botName, difficulty });
  state.bots.set(botId, new Bot().assign({
    x: Math.random() * state.width,
    y: Math.random() * state.height,
    targetX: Math.random() * state.width,
    targetY: Math.random() * state.height,
    difficulty: difficulty,
    name: botName,
    speed: constants.PLAYER_SPEED,
  }));
};

const onBotUpdate = (state: ArenaState, botId: string, delta: number) => {
  const thisBot = state.bots.get(botId);
  const changeTargetChance = Math.floor(Math.random() * 200);
  if (changeTargetChance > 198) {
    thisBot.assign({
      targetX: Math.random() * state.width,
      targetY: Math.random() * state.height,
    });
  }

  const speed = thisBot.speed * delta;
  const dirX = thisBot.targetX - thisBot.x;
  const dirY = thisBot.targetY - thisBot.y;

  const dir = normalize(dirX, dirY);

  thisBot.x += speed * dir.x;
  thisBot.y += speed * dir.y;

  const minBounds = thisBot.radius;
  const maxBounds = constants.WORLD_SIZE - thisBot.radius;

  if (thisBot.y < minBounds) { thisBot.y = minBounds; }
  if (thisBot.y > maxBounds) { thisBot.y = maxBounds; }

  if (thisBot.x < minBounds) { thisBot.x = minBounds; }
  if (thisBot.x > maxBounds) { thisBot.x = maxBounds; }

  if (distance(thisBot.x, thisBot.y, thisBot.targetX, thisBot.targetY) < 1) {
    thisBot.x = thisBot.targetX;
    thisBot.y = thisBot.targetY;
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