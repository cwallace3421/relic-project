import http from "http";
import { Client, generateId } from "colyseus";

import { ArenaState } from "./ArenaState";
import { Player } from "./Player";
import logger, { LogCodes } from '../../utils/logger';
import constants from "../../utils/constants";
import { distance, normalize, rotate } from '../../utils/vector';
import { randomNumberInRange } from '../../utils/random';
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
  const deltaTime: number = delta / 1000;

  state.players.forEach((player) => {
    onPlayerUpdate(state, player, deltaTime);
  });

  state.players.forEach((player) => {
    if (player.dead) {
      state.players.delete(player.id);
    }
  });

  if (state.rockets.size > 0) {
    state.rockets.forEach((rocket) => {
      if (rocket.active) {
        onRocketUpdate(state, rocket, deltaTime);
      }
    });

    state.rockets.forEach((rocket) => {
      if (!rocket.active || state.players.size === 0) {
        state.rockets.delete(rocket.id);
      }
    });
  }

  if (constants.BOT_ENABLED) {
    state.bots.forEach((bot) => {
      onBotUpdate(state, bot, deltaTime);
    })
  }
};

const onPlayerAuth = (client: Client, options: any, request: http.IncomingMessage): boolean => {
  return !!options.name;
};

const onPlayerJoin = (state: ArenaState, client: Client, options: any) => {
  logger.info("Player joined room.", LogCodes.SERVER_PLAYER, { sessionId: client.sessionId });

  state.players.set(client.sessionId, new Player().assign({
    id: client.sessionId,
    name: options.name,
    x: Math.random() * state.width,
    y: Math.random() * state.height,
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

const onPlayerUpdate = (state: ArenaState, player: Player, delta: number): void => {
  const speed = player.speed * delta;

  deflectRockets(state, player);

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
    const targetId = getRandomActorId(state);
    const spawnDirection = rotate(0, 1, randomNumberInRange(0, 360)); // TODO: Maybe should spawn pointing at the first target?
    logger.info('Rocket has got target.', LogCodes.SERVER_ROCKET, { rocketId, targetId, spawnDirection });
    state.rockets.set(rocketId, new Rocket().assign({
      id: rocketId,
      targetId,
      speed: constants.ROCKET_SPEED,
      x: constants.WORLD_SIZE / 2,
      y: constants.WORLD_SIZE / 2,
      directionX: spawnDirection.x,
      directionY: spawnDirection.y,
      active: true,
    }));
  } else {
    logger.error('Unable to spawn rocket as there is no players.', LogCodes.SERVER_ROCKET)
  }
};

const onRocketUpdate = (state: ArenaState, rocket: Rocket, delta: number): void => {
  const speed = rocket.speed * delta;

  const targetId = rocket.targetId;
  if (!targetId) {
    logger.error('Rocket does not have a populated target.', LogCodes.SERVER_ROCKET, { rocketId: rocket.id });
    return;
  }

  const targetActor = getActor(state, targetId);
  if (!targetActor) {
    logger.error('Rocket target id does not point to a existing player.', LogCodes.SERVER_ROCKET, { rocketId: rocket.id, targetId });
    return;
  }

  const dir = normalize(targetActor.x - rocket.x, targetActor.y - rocket.y);
  rocket.x += speed * dir.x;
  rocket.y += speed * dir.y;

  if (distance(rocket.x, rocket.y, targetActor.x, targetActor.y) < 1) {
    rocket.x = targetActor.x;
    rocket.y = targetActor.y;
  }

  const collided = circle(rocket.x, rocket.y, rocket.radius, targetActor.x, targetActor.y, targetActor.radius);
  if (collided) {
    retargetRocket(state, rocket);
    // TODO: Kill collided target
  }
};

const retargetRocket = (state: ArenaState, rocket: Rocket): boolean => {
  const newTargetId = getRandomActorId(state, [rocket.targetId]);
  if (newTargetId) {
    logger.info('Rocket is being deflected, retargeting.', LogCodes.SERVER_ROCKET, { rocketId: rocket.id, oldTargetId: rocket.targetId, newTargetId });
    rocket.assign({ targetId: newTargetId });
    return true;
  } else {
    logger.error('Unable to get new target for rocket, destorying rocket.', LogCodes.SERVER_ROCKET, { rocketId: rocket.id });
    rocket.assign({ active: false });
    return false;
  }
};

const onBotSpawn = (state: ArenaState) => {
  const difficulty = Math.floor(Math.random() * 8);
  const botId = generateId();
  const botName = getRandomBotName(` (D:${difficulty})`);

  logger.info("Bot joined room.", LogCodes.SERVER_BOT, { botId, botName, difficulty });
  state.bots.set(botId, new Bot().assign({
    id: botId,
    name: botName,
    x: Math.random() * state.width,
    y: Math.random() * state.height,
    targetX: Math.random() * state.width,
    targetY: Math.random() * state.height,
    difficulty: difficulty,
    speed: constants.PLAYER_SPEED,
  }));
};

const onBotUpdate = (state: ArenaState, bot: Bot, delta: number) => {
  const changeTargetChance = Math.floor(Math.random() * 200);
  if (changeTargetChance > 198) {
    bot.assign({
      targetX: Math.random() * state.width,
      targetY: Math.random() * state.height,
    });
  }

  deflectRockets(state, bot);

  const speed = bot.speed * delta;
  const dirX = bot.targetX - bot.x;
  const dirY = bot.targetY - bot.y;

  const dir = normalize(dirX, dirY);

  bot.x += speed * dir.x;
  bot.y += speed * dir.y;

  const minBounds = bot.radius;
  const maxBounds = constants.WORLD_SIZE - bot.radius;

  if (bot.y < minBounds) { bot.y = minBounds; }
  if (bot.y > maxBounds) { bot.y = maxBounds; }

  if (bot.x < minBounds) { bot.x = minBounds; }
  if (bot.x > maxBounds) { bot.x = maxBounds; }

  if (distance(bot.x, bot.y, bot.targetX, bot.targetY) < 1) {
    bot.x = bot.targetX;
    bot.y = bot.targetY;
  }
};

const deflectRockets = (state: ArenaState, actor: Player | Bot): void => {
  state.rockets.forEach((rocket) => {
    if (actor.id === rocket.targetId) {
      const collided = circle(rocket.x, rocket.y, rocket.radius, actor.x, actor.y, actor.radius * 2);
      if (collided) {
        retargetRocket(state, rocket);
        if (rocket.speed < constants.ROCKET_MAX_SPEED) {
          const newSpeed = Math.round(Math.min(rocket.speed * (constants.ROCKET_SPEED_INCREASE + 1), constants.ROCKET_MAX_SPEED));
          rocket.assign({ speed: newSpeed });
        }
      }
    }
  });
};

const getRandomActorId = (state: ArenaState, exclude: Array<string> = []): string | undefined => {
  const playerIdMap: { id: string, type: "PLAYER" | "BOT" }[] = [...state.players.keys()].filter((id) => !exclude.includes(id)).map((id) => ({ id, type: "PLAYER" }));
  const botIdMap: { id: string, type: "PLAYER" | "BOT" }[] = [...state.bots.keys()].filter((id) => !exclude.includes(id)).map((id) => ({ id, type: "BOT" }));

  const idMap = [...botIdMap]; // [...playerIdMap, ...botIdMap];

  if (idMap.length === 0) return;

  const randomIndex = Math.floor(Math.random() * (idMap.length - exclude.length));

  return idMap[randomIndex].id;
}

const getActor = (state: ArenaState, id: string): Player | Bot | undefined => {
  return state.players.get(id) ?? state.bots.get(id) ?? undefined;
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