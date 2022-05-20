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
  const deltaTime: number = delta / 1000;

  state.players.forEach((player, sessionId) => {
    onPlayerUpdate(state, sessionId, deltaTime);
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

const onPlayerUpdate = (state: ArenaState, playerId: string, delta: number): void => {
  const thisPlayer = state.players.get(playerId);
  const speed = thisPlayer.speed * delta;

  deflectRockets(state, playerId, thisPlayer);

  let dir = { x: 0, y: 0 };

  if (thisPlayer.isUpPressed === true) {
    dir.y = -1;
  }
  else if (thisPlayer.isDownPressed === true) {
    dir.y = 1;
  }

  if (thisPlayer.isLeftPressed === true) {
    dir.x = -1;
  }
  else if (thisPlayer.isRightPressed === true) {
    dir.x = 1;
  }

  if (dir.x === 0 && dir.y === 0) {
    return;
  }

  dir = normalize(dir.x, dir.y);

  thisPlayer.x += speed * dir.x;
  thisPlayer.y += speed * dir.y;

  const minBounds = thisPlayer.radius;
  const maxBounds = constants.WORLD_SIZE - thisPlayer.radius;

  if (thisPlayer.y < minBounds) { thisPlayer.y = minBounds; }
  if (thisPlayer.y > maxBounds) { thisPlayer.y = maxBounds; }

  if (thisPlayer.x < minBounds) { thisPlayer.x = minBounds; }
  if (thisPlayer.x > maxBounds) { thisPlayer.x = maxBounds; }
};

const onRocketSpawn = (state: ArenaState): void => {
  logger.info('Attempting to spawn one rocket.', LogCodes.SERVER_ROCKET);
  if (state.players.size > 0) {
    const rocketId = generateId();
    const targetId = getRandomActorId(state);
    logger.info('Rocket has got target.', LogCodes.SERVER_ROCKET, { rocketId, targetId });
    state.rockets.set(rocketId, new Rocket().assign({
      id: rocketId,
      targetId,
      speed: constants.ROCKET_SPEED,
      x: constants.WORLD_SIZE / 2,
      y: constants.WORLD_SIZE / 2,
      active: true,
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

  const targetActor = getActor(state, targetId);
  if (!targetActor) {
    logger.error('Rocket target id does not point to a existing player.', LogCodes.SERVER_ROCKET, { rocketId, targetId });
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
    retargetRocket(state, rocketId, rocket, targetId);
    // TODO: Kill collided target
  }
};

const retargetRocket = (state: ArenaState, rocketId: string, rocket: Rocket, previousTargetId: string): boolean => {
  const newTargetId = getRandomActorId(state, previousTargetId ? [previousTargetId] : []);
  if (newTargetId) {
    logger.info('Rocket is being deflected, retargeting.', LogCodes.SERVER_ROCKET, { rocketId, oldTargetId: rocket.targetId, newTargetId });
    rocket.assign({ targetId: newTargetId });
    return true;
  } else {
    logger.error('Unable to get new target for rocket, destorying rocket.', LogCodes.SERVER_ROCKET, { rocketId });
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

const onBotUpdate = (state: ArenaState, botId: string, delta: number) => {
  const thisBot = state.bots.get(botId);
  const changeTargetChance = Math.floor(Math.random() * 200);
  if (changeTargetChance > 198) {
    thisBot.assign({
      targetX: Math.random() * state.width,
      targetY: Math.random() * state.height,
    });
  }

  deflectRockets(state, botId, thisBot);

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

const deflectRockets = (state: ArenaState, actorId: string, actor: Player | Bot): void => {
  state.rockets.forEach((rocket, id) => {
    if (actorId === rocket.targetId) {
      const collided = circle(rocket.x, rocket.y, rocket.radius, actor.x, actor.y, actor.radius * 2);
      if (collided) {
        retargetRocket(state, id, rocket, actorId);
        if (rocket.speed < constants.ROCKET_MAX_SPEED) {
          const newSpeed = Math.min(rocket.speed * (constants.ROCKET_SPEED_INCREASE + 1), constants.ROCKET_MAX_SPEED);
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