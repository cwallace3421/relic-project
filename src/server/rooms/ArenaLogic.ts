import * as http from "http";
import { Client, generateId } from "colyseus";

import { ArenaState } from "./ArenaState";
import { Bot } from "./Bot";
import { Collision } from '../../utils/Collision';
import { getRandomBotName } from '../../utils/botnames';
import { Player } from "./Player";
import { randomNumberInRange } from '../../utils/random';
import { Rocket } from "./Rocket";
import { VectorMath } from '../../utils/VectorMath';
import { Victor } from '../../utils/Victor';
import constants from "../../utils/constants";
import logger, { LogCodes } from '../../utils/logger';

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

  deflectRockets(state, player);

  const moveDirection = new Victor(0, 0);

  if (player.isUpPressed === true) {
    moveDirection.y = -1;
  }
  else if (player.isDownPressed === true) {
    moveDirection.y = 1;
  }

  if (player.isLeftPressed === true) {
    moveDirection.x = -1;
  }
  else if (player.isRightPressed === true) {
    moveDirection.x = 1;
  }

  if (moveDirection.x === 0 && moveDirection.y === 0) {
    return;
  }

  const speed = player.speed * delta;
  const minBounds = player.radius;
  const maxBounds = constants.WORLD_SIZE - player.radius;

  const newPlayerPosition = player.getPosition().clone();

  newPlayerPosition.add(moveDirection.normalize().multiplyScalar(speed));

  VectorMath.min(newPlayerPosition, maxBounds);
  VectorMath.max(newPlayerPosition, minBounds);

  Player.setPosition(player, newPlayerPosition);
};

const onRocketSpawn = (state: ArenaState): void => {
  logger.info('Attempting to spawn one rocket.', LogCodes.SERVER_ROCKET);
  if (state.players.size > 0) {
    const rocketId = generateId();
    const targetId = getRandomActorId(state);
    const spawnDirection = Victor.getZero().rotateDeg(randomNumberInRange(0, 360)).normalize(); // TODO: Maybe should spawn pointing at the first target?
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

  const speed = rocket.speed * delta;
  const overlapDistance = rocket.radius + targetActor.radius;

  const rocketPosition = rocket.getPosition();
  const targetActorPosition = targetActor.getPosition();

  const distanceToTarget = rocketPosition.distance(targetActorPosition); // Distance from center of rocket to center of target
  const directionToTarget = VectorMath.direction(rocketPosition, targetActorPosition).normalize();
  const newRocketPosition = rocketPosition.clone();

  let collided = false;

  if (distanceToTarget <= overlapDistance) {
    Rocket.setPosition(rocket, newRocketPosition.add(directionToTarget.multiplyScalar(overlapDistance)));
    collided = true;
  } else {
    Rocket.setPosition(rocket, newRocketPosition.add(directionToTarget.multiplyScalar(speed)));
    collided = false;
  }

  collided = collided || Collision.circle(newRocketPosition, rocket.radius, targetActorPosition, targetActor.radius);

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
  const botPosition = bot.getPosition();
  const targetPosition = bot.getTargetPosition();

  deflectRockets(state, bot);

  const speed = bot.speed * delta;
  const minBounds = bot.radius;
  const maxBounds = constants.WORLD_SIZE - bot.radius;

  const directionToTarget = VectorMath.direction(botPosition, targetPosition).normalize();
  const newBotPosition = botPosition.clone().add(directionToTarget.multiplyScalar(speed));

  VectorMath.min(newBotPosition, maxBounds);
  VectorMath.max(newBotPosition, minBounds);

  if (newBotPosition.distance(targetPosition) < 1) {
    Bot.setPosition(bot, targetPosition);
  } else {
    Bot.setPosition(bot, newBotPosition);
  }

  // Decide if the Bot should choose a new location to move to.
  const changeTargetChance = Math.floor(Math.random() * 200);
  if (changeTargetChance > 198) {
    Bot.setTargetPositionXY(bot, Math.random() * state.width, Math.random() * state.height);
  }
};

const deflectRockets = (state: ArenaState, actor: Player | Bot): void => {
  state.rockets.forEach((rocket) => {
    if (actor.id === rocket.targetId) {
      const collided = Collision.circle(rocket.getPosition(), rocket.radius, actor.getPosition(), actor.radius * 2);
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