import * as PIXI from "pixi.js";
import * as Viewport from "pixi-viewport";
import { Room, Client } from "colyseus.js";
import type { ArenaState } from "../server/rooms/ArenaState";
import { PingPong } from "./PingPong";
import { TimingGraph, TimingEventType } from "./TimingGraph";
import constants from "../utils/constants";
import { Keyboard, UserActions } from "./Keyboard";
import { Actor, ActorType } from "./Actor";
import { Rocket } from "./Rocket";
import logger, { LogCodes } from "../utils/logger";

const ENDPOINT = `ws://${window.location.host}`;

enum WorldEntityType {
  PLAYER = "PLAYER",
  BOT = "BOT",
  ROCKET = "ROCKET",
};

type WorldEntityMap = {
  [id: string]: WorldEntity;
};

type WorldEntity = {
  type: WorldEntityType;
  entity: Actor | Rocket;
};

// interface ServerEntity {
//   type: ServerEntityType;
//   speed: number;
//   positionBuffer: {
//     id: number;
//     timestamp: number;
//     timeElapsed?: number;
//     speed?: number;
//     x?: number;
//     y?: number;
//   }[];
//   gfx: PIXI.Graphics;
//   flag?: boolean;
// };

// interface ServerEntityMap {
//   [id: string]: ServerEntity
// };



export class Application extends PIXI.Application {
  worldEntityMap: WorldEntityMap = {};
  clientEntity: WorldEntity;

  client: Client = new Client(ENDPOINT);
  room: Room<ArenaState>;

  viewport: Viewport;

  keyboard: Keyboard;
  pingPong: PingPong;
  timingGraph: TimingGraph;

  boundaries: PIXI.Graphics;

  // -----------------------------------------------------------------------------------------------
  constructor() {
    super({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x0c0c0c
    });

    this.viewport = new Viewport({
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      worldWidth: constants.WORLD_SIZE,
      worldHeight: constants.WORLD_SIZE,
    });

    // draw boundaries of the world
    this.boundaries = new PIXI.Graphics();
    this.boundaries.beginFill(0x000000);
    this.boundaries.drawRoundedRect(0, 0, constants.WORLD_SIZE, constants.WORLD_SIZE, 30);
    this.viewport.addChild(this.boundaries);

    this.boundaries.lineStyle(1, 0xffb3f6);

    // add viewport to stage
    this.stage.addChild(this.viewport);

    this.authenticate();

    // this.ticker.maxFPS = 120;
    // this.ticker.minFPS = 30;
    // requestAnimationFrame(() => {})
    // this.ticker.add(this.tick.bind(this));

    requestAnimationFrame(this.loop.bind(this));

    this.pingPong = new PingPong(true, this.stage);
    this.timingGraph = new TimingGraph(false, this.stage);

    this.keyboard = new Keyboard((action: UserActions) => {
      if (action === UserActions.ZOOM_IN) this.timingGraph.changeGraphScale(1);
      if (action === UserActions.ZOOM_OUT) this.timingGraph.changeGraphScale(-1);
      if (action === UserActions.TOGGLE_TIMING_GRAPH) this.timingGraph.toggleEnabled();
    });

    // this.interpolation = false;
  }

  // -----------------------------------------------------------------------------------------------
  async authenticate() {
    // anonymous auth for social
    // await this.client.auth.login();

    // console.log("Success!", this.client.auth);

    const playerName = (window as any).custom.name;
    this.room = await this.client.joinOrCreate<ArenaState>(constants.ROOM_NAME, { name: playerName });

    // PLAYERS ------
    this.room.state.players.onAdd = (playerServerEntity, sessionId: string) => {
      logger.info('Player joined the game', LogCodes.CLIENT_ENTITY_INFO, { ...playerServerEntity });

      const isClient = sessionId === this.room.sessionId;
      const actor = new Actor(this.viewport)
        .initMeta(ActorType.PLAYER, isClient, sessionId, playerServerEntity.name)
        .initGraphics(playerServerEntity.x, playerServerEntity.y, playerServerEntity.radius, 0xFFFF0B)
        .initProperties(playerServerEntity.speed);

      this.worldEntityMap[sessionId] = {
        type: WorldEntityType.PLAYER,
        entity: actor,
      };

      if (isClient) this.clientEntity = this.worldEntityMap[sessionId];

      playerServerEntity.onChange = (changes) => actor.onStateChange(sessionId, changes);
      playerServerEntity.onRemove = () => {
        if (!!this.worldEntityMap[sessionId]) {
          actor.onEntityRemove(sessionId);
          delete this.worldEntityMap[sessionId];
          if (actor.getIsClient()) {
            delete this.clientEntity;
          }
        } else {
          logger.error('Attempting to remove player, but they do not exist in the server entity map.', LogCodes.CLIENT_ENTITY_ERROR, { sessionId });
        }
      };
    };

    // BOTS ------
    this.room.state.bots.onAdd = (botServerEntity, botId) => {
      const actor = new Actor(this.viewport)
        .initMeta(ActorType.BOT, false, botId, botServerEntity.name)
        .initGraphics(botServerEntity.x, botServerEntity.y, botServerEntity.radius, 0xFF550B)
        .initProperties(botServerEntity.speed);

      this.worldEntityMap[botId] = {
        type: WorldEntityType.BOT,
        entity: actor,
      };

      botServerEntity.onChange = (changes) => actor.onStateChange(botId, changes);
      botServerEntity.onRemove = () => {
        if (!!this.worldEntityMap[botId]) {
          actor.onEntityRemove(botId);
          delete this.worldEntityMap[botId];
        } else {
          logger.error('Attempting to remove bot, but they do not exist in the server entity map.', LogCodes.CLIENT_ENTITY_ERROR, { botId });
        }
      };
    };

    // ROCKETS ------
    this.room.state.rockets.onAdd = (rocketServerEntity, rocketId: string) => {
      const rocket = new Rocket(this.viewport)
        .initGraphics(rocketServerEntity.x, rocketServerEntity.y, rocketServerEntity.radius, 0xFF0000)
        .initMeta(rocketId)
        .initProperties(rocketServerEntity.speed);

      this.worldEntityMap[rocketId] = {
        type: WorldEntityType.ROCKET,
        entity: rocket,
      };

      rocketServerEntity.onChange = (changes) => rocket.onStateChange(rocketId, changes);
      rocketServerEntity.onRemove = () => {
        if (!!this.worldEntityMap[rocketId]) {
          rocket.onEntityRemove(rocketId);
          delete this.worldEntityMap[rocketId];
        } else {
          logger.error('Attempting to remove rocket, but they do not exist in the server entity map.', LogCodes.CLIENT_ENTITY_ERROR, { rocketId });
        }
      };
    };

    this.pingPong.start(this.room);
  }

  // -----------------------------------------------------------------------------------------------
  tick(deltaTime: number) {
    const _tickComplete = this.timingGraph.addTimingEventCallback(TimingEventType.TICK);

    this.keyboard.tick(this.room, this.timingGraph);

    for (const entityId in this.worldEntityMap) {
      const entity = this.worldEntityMap[entityId].entity;
      entity.onTick(deltaTime);
    }

    this.pingPong.tick();
    this.timingGraph.tick();

    _tickComplete();
  }

  // -----------------------------------------------------------------------------------------------
  private lastTime: number;
  loop(now: number) {
    if(!this.lastTime) {
      this.lastTime = now;
    }

    this.tick(now - this.lastTime);

    this.lastTime = now;

    requestAnimationFrame(this.loop.bind(this));
  }
}