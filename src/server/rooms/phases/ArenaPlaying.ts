import type { ArenaRoom } from "../ArenaRoom";
import type { Player } from "../Player";
import type { Bot } from "../Bot";
import type { Client, Delayed } from "colyseus";
import { ACTOR_TYPE, PHASE_NAME } from "../../../utils/enums";
import { ArenaPhase } from "./ArenaPhase";
import { Collision } from "../../../utils/Collision";
import { generateId } from "colyseus";
import { lerpAngle } from "../../../utils/vector";
import { randomNumberInRange } from "../../../utils/random";
import { Rocket } from "../Rocket";
import { VectorMath } from "../../../utils/VectorMath";
import { Victor } from "../../../utils/Victor";
import logger, { LogCodes } from '../../../utils/logger';
import constants from "../../../utils/constants";

export class ArenaPlaying extends ArenaPhase {

  private static PHASE_DURATION: number = 3 * 60 * 1000; // 3 Minutes
  private static ROCKET_SPAWN_INTERVAL: number = 2 * 1000; // 2 Seconds

  private rocketSpawnTimer: Delayed;

  constructor(room: ArenaRoom) {
    super(room, ArenaPlaying.PHASE_DURATION);
  }

  // @Override -------------------------------------------------------------------------------------
  onPhaseStart(): void {
    logger.info("Start Phase", LogCodes.ARENA_STATE_PLAYING);
    this.startPhaseTimer();
    this.rocketSpawnTimer = this.room.clock.setTimeout(this.onTriggerRocketSpawn.bind(this), ArenaPlaying.ROCKET_SPAWN_INTERVAL);
  }

  // @Override -------------------------------------------------------------------------------------
  onPlayerJoin(client: Client, options: any): void {
    // TODO: Spawn As Spectator // const player = this.getState().players.get(client.sessionId);
  }

  // @Override -------------------------------------------------------------------------------------
  onPlayerLeave(client: Client): void {
    // TODO: Check to ensure there are players still left to continue the game
  }

  // @Override -------------------------------------------------------------------------------------
  onTick(delta: number): void {
    const state = this.getState();

    state.rockets.forEach((rocket) => {
      if (rocket.active) {
        this.onRocketUpdate(rocket, delta);
      }
    });

    state.rockets.forEach((rocket) => {
      if (!rocket.active || state.players.size === 0) {
        state.rockets.delete(rocket.id);
      }
    });
  }

  // @Override -------------------------------------------------------------------------------------
  onPhaseEnd(): void {
    logger.info("End Phase", LogCodes.ARENA_STATE_PLAYING);
    this.rocketSpawnTimer.clear();
    this.clearPhaseTimer();
    this.room.changePhase(PHASE_NAME.ARENA_FINISH);
  }

  // @Override -------------------------------------------------------------------------------------
  onPhaseTimerEnd(): void {
    this.onPhaseEnd();
  }

  // -----------------------------------------------------------------------------------------------
  onTriggerRocketSpawn(): void {
    logger.info('Attempting to spawn one rocket.', LogCodes.SERVER_ROCKET);
    const state = this.getState();
    const actorCount = [...state.players.values(), ...state.bots.values()].filter(actor => !actor.dead).length;

    if (actorCount > 1) {
      const rocketId = generateId();
      const targetId = this.getRandomActorId();
      const spawnDirection = Victor.getIdentity().rotateToDeg(randomNumberInRange(0, 360)).normalize(); // TODO: Maybe should spawn pointing at the first target?

      logger.info('Rocket has got target.', LogCodes.SERVER_ROCKET, { rocketId, targetId, spawnDirection });
      state.rockets.set(rocketId, new Rocket().assign({
        id: rocketId,
        targetId,
        speed: constants.ROCKET_START_SPEED,
        x: constants.WORLD_SIZE / 2,
        y: constants.WORLD_SIZE / 2,
        rotation: spawnDirection.angleDeg(),
        directionX: spawnDirection.x,
        directionY: spawnDirection.y,
        active: true,
      }));
    } else if (actorCount > 0) {
      this.onPhaseEnd(); // TODO: This means the phase will only end when the rocket spawn timer is finished. So there is a small delay from the 2nd to last person dying and this triggering.
    } else {
      logger.error('Unable to spawn rocket as there is no players.', LogCodes.SERVER_ROCKET)
    }
  };

  // -----------------------------------------------------------------------------------------------
  onRocketUpdate(rocket: Rocket, delta: number): void {
    const targetId = rocket.targetId;
    if (!targetId) {
      logger.error('Rocket does not have a populated target.', LogCodes.SERVER_ROCKET, { rocketId: rocket.id });
      return;
    }

    const targetActor = this.getActor(targetId);
    if (!targetActor || targetActor.dead) {
      logger.error('Rocket target id does not point to an alive or existing player. Retargeting.', LogCodes.SERVER_ROCKET, { rocketId: rocket.id, targetId });
      this.retargetRocket(rocket);
      return;
    }

    const speed = rocket.speed * delta;
    const overlapDistance = rocket.radius + targetActor.radius;

    const rocketPosition = rocket.getPosition();
    const rocketDirection = rocket.getDirection();
    const targetActorPosition = targetActor.getPosition();

    const directionToTarget = VectorMath.direction(rocketPosition, targetActorPosition).normalize();

    const newAngle = lerpAngle(rocketDirection.angleDeg(), directionToTarget.angleDeg(), (rocket.speed / 70) * delta); // TODO: Magic number
    const newRocketDirection = rocketDirection.clone().rotateToDeg(newAngle).normalize();
    Rocket.setDirection(rocket, newRocketDirection);

    let collided = false;

    const newRocketPosition = rocketPosition.clone();
    const distanceToTarget = newRocketPosition.distance(targetActorPosition); // Distance from center of rocket to center of target

    if (distanceToTarget <= overlapDistance) {
      Rocket.setPosition(rocket, newRocketPosition.add(newRocketDirection.multiplyScalar(overlapDistance)));
      collided = true;
    } else {
      Rocket.setPosition(rocket, newRocketPosition.add(newRocketDirection.multiplyScalar(speed)));
      collided = false;
    }

    collided = collided || Collision.circle(newRocketPosition, rocket.radius, targetActorPosition, targetActor.radius);

    if (collided) {
      this.room.state.rockets.delete(rocket.id);
      this.rocketSpawnTimer.clear();
      this.rocketSpawnTimer = this.room.clock.setTimeout(this.onTriggerRocketSpawn.bind(this), ArenaPlaying.ROCKET_SPAWN_INTERVAL);
      logger.info('Rocket has collided with an actor, killing them.', LogCodes.SERVER_ROCKET, { rocketId: rocket.id, actorId: targetActor.id });
      targetActor.assign({ dead: true });
    }
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

  // -----------------------------------------------------------------------------------------------
  getActor(id: string): Player | Bot | undefined {
    return this.getState().players.get(id) ?? this.getState().bots.get(id) ?? undefined;
  }

}