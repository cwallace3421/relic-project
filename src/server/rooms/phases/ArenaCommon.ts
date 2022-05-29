import type { ArenaRoom } from "../ArenaRoom";
import type { Client } from "colyseus";
import { ACTOR_TYPE } from "../../../utils/enums";
import { ArenaPhase } from "./ArenaPhase";
import { Bot } from "../Bot";
import { Collision } from "../../../utils/Collision";
import { Player } from "../Player";
import { Rocket } from "../Rocket";
import { VectorMath } from "../../../utils/VectorMath";
import { Victor } from "../../../utils/Victor";
import logger, { LogCodes } from "../../../utils/logger";
import constants from "../../../utils/constants";

export class ArenaCommon extends ArenaPhase {

  constructor(room: ArenaRoom) {
    super(room, -1);
  }

  // @Override -------------------------------------------------------------------------------------
  onPhaseStart(): void {
    throw new Error("Method not implemented.");
  }

  // @Override -------------------------------------------------------------------------------------
  onPlayerJoin(client: Client, options: any): void {
    logger.info("Player joined room.", LogCodes.SERVER_PLAYER, { sessionId: client.sessionId });

    const state = this.getState();
    state.players.set(client.sessionId, new Player().assign({
      id: client.sessionId,
      name: `${options.name} [${client.sessionId}]`,
      x: Math.random() * state.width,
      y: Math.random() * state.height,
      speed: constants.PLAYER_SPEED,
    }));
  }

  // @Override -------------------------------------------------------------------------------------
  onPlayerLeave(client: Client): void {
    const player = this.getState().players.get(client.sessionId);
    if (player) {
      logger.info("Player left room.", LogCodes.SERVER_PLAYER, { sessionId: client.sessionId });
      this.getState().players.delete(player.id);
    }
  }

  // @Override -------------------------------------------------------------------------------------
  onTick(delta: number): void {
    const state = this.getState();

    state.players.forEach((player) => {
      if (!player.dead && !player.frozen) {
        this.onPlayerUpdate(player, delta);
      }
    });

    state.bots.forEach((bot) => {
      if (!bot.dead && !bot.frozen) {
        this.onBotUpdate(bot, delta);
      }
    });
  }

  // @Override -------------------------------------------------------------------------------------
  onPhaseEnd(): void {
    throw new Error("Method not implemented.");
  }

  // @Override -------------------------------------------------------------------------------------
  onPhaseTimerEnd(): void {
    throw new Error("Method not implemented.");
  }

  // -----------------------------------------------------------------------------------------------
  onPlayerUpdate(player: Player, delta: number): void {
    // Player Movement
    const moveDirection = new Victor(0, 0);

    if (player.isUpPressed === true) {
      moveDirection.y = -1;
    } else if (player.isDownPressed === true) {
      moveDirection.y = 1;
    }

    if (player.isLeftPressed === true) {
      moveDirection.x = -1;
    } else if (player.isRightPressed === true) {
      moveDirection.x = 1;
    }

    if (moveDirection.x !== 0 || moveDirection.y !== 0) {
      const speed = player.speed * delta;
      const minBounds = player.radius;
      const maxBounds = constants.WORLD_SIZE - player.radius;

      const newPlayerPosition = player.getPosition().clone();

      newPlayerPosition.add(moveDirection.normalize().multiplyScalar(speed));

      VectorMath.min(newPlayerPosition, maxBounds);
      VectorMath.max(newPlayerPosition, minBounds);

      Player.setPosition(player, newPlayerPosition);
    }

    // Player Interaction
    if (player.isInteractPressed && player.interactedPressedTime < 120) {
      logger.info('Interact is currently pressed.', LogCodes.SERVER_PLAYER, { timePressed: player.interactedPressedTime });
      this.deflectRockets(player);
      player.interactedPressedTime += (delta * 1000);
    } else if (!player.isInteractPressed && player.interactedPressedTime !== 0) {
      player.interactedPressedTime = 0;
    }
  }

  // -----------------------------------------------------------------------------------------------
  onBotUpdate(bot: Bot, delta: number): void {
    const botPosition = bot.getPosition();
    const targetPosition = bot.getTargetPosition();

    const deflectRocketChance = Math.floor(Math.random() * 200);
    if (deflectRocketChance > 180) {
      this.deflectRockets(bot);
    }

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
      Bot.setTargetPositionXY(bot, Math.random() * this.getState().width, Math.random() * this.getState().height);
    }
  }

  // -----------------------------------------------------------------------------------------------
  deflectRockets(actor: Player | Bot): void {
    this.getState().rockets.forEach((rocket) => {
      if (actor.id === rocket.targetId) {
        const collided = Collision.circle(rocket.getPosition(), rocket.radius, actor.getPosition(), constants.DEFLECT_RADIUS);
        if (collided) {
          this.retargetRocket(rocket);
          const directionToTarget = VectorMath.direction(rocket.getPosition(), actor.getPosition()).normalize();
          Rocket.setDirection(rocket, directionToTarget.invert());
          if (rocket.speed < constants.ROCKET_MAX_SPEED) {
            const newSpeed = Math.round(Math.min(rocket.speed * (constants.ROCKET_SPEED_INCREASE + 1), constants.ROCKET_MAX_SPEED));
            rocket.assign({ speed: newSpeed });
          }
          logger.info('Rocket deflected by actor.', LogCodes.SERVER_ROCKET, { rocketId: rocket.id, actorId: actor.id, speed: rocket.speed });
        }
      }
    });
  }

  // -----------------------------------------------------------------------------------------------
  retargetRocket(rocket: Rocket): boolean {
    const newTargetId = this.getRandomActorId([rocket.targetId]);
    if (newTargetId) {
      logger.info('Rocket is being retargeted.', LogCodes.SERVER_ROCKET, { rocketId: rocket.id, oldTargetId: rocket.targetId, newTargetId });
      rocket.assign({ targetId: newTargetId });
      return true;
    } else {
      logger.error('Unable to get new target for rocket, destorying rocket.', LogCodes.SERVER_ROCKET, { rocketId: rocket.id });
      rocket.assign({ active: false });
      return false;
    }
  }

  // -----------------------------------------------------------------------------------------------
  getRandomActorId(exclude: Array<string> = []): string | undefined {
    const state = this.getState();

    const playerIdMap: { id: string, type: ACTOR_TYPE }[] = [...state.players.values()].filter((player) => !exclude.includes(player.id) && !player.dead).map((player) => ({ id: player.id, type: ACTOR_TYPE.PLAYER }));
    const botIdMap: { id: string, type: ACTOR_TYPE }[] = [...state.bots.values()].filter((bot) => !exclude.includes(bot.id) && !bot.dead).map((bot) => ({ id: bot.id, type: ACTOR_TYPE.BOT }));
    const idMap = [...playerIdMap, ...botIdMap]; // [...playerIdMap, ...botIdMap];

    if (idMap.length === 0) return;

    return idMap[Math.floor(Math.random() * (idMap.length - exclude.length))].id;
  }

}

/*
  States
  - 1. Waiting For Players
    - When player joins start timer
    - When timer completes, fill room with bots
    - Move to next state
    (no rocket, can't deflect, can't die)
    (can run around, can chat, can emote)
  - 2. Countdown to Start
    - Teleport players into position
    - Freeze players
    - Countdown
    - Move to next state
    (no rocket, can't deflect, can't die, can't move)
    (can chat, can emote)
  - 3. Main Game
    - Start a timer
    - Spawn a rocket
    - Everytime a rocket gets destoryed, spawn a new one
    - Move to next state when one player left alive, or time has run out
    (no restrictions)
    (rockets, can deflect, can die, can move, can chat, can emote)
  - 4. Game Over
    - Start a timer
    - Message to celebrate the winner
    - Move to first state after timer


  Notes:

  If a player joins after state 1, put them in spectate mode, until the state 1 starts again

  If no real players are in the game at any point, kill the game
*/