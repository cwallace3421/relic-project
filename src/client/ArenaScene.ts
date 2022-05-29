import Phaser from 'phaser';
import { Room, Client } from "colyseus.js";
import { Actor, ActorType } from "./entities/Actor";
import { Rocket } from "./entities/Rocket";
import { InputManager, UserActions } from './InputManager';
import logger, { LogCodes } from "../utils/logger";
import constants from '../utils/constants';

import type { ArenaState } from "../server/rooms/ArenaState";
import { PingManager } from './PingManager';

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

export default class ArenaScene extends Phaser.Scene {

  private client: Client;
  private room: Room;

  private worldEntityMap: WorldEntityMap;
  private clientEntity: WorldEntity;

  private inputManager: InputManager;
  private pingManager: PingManager;

  private playarea: Phaser.GameObjects.Rectangle;

  private labelPhaseTimer: Phaser.GameObjects.BitmapText;
  private labelPhaseType: Phaser.GameObjects.BitmapText;

  // -----------------------------------------------------------------------------------------------
  constructor() {
    super({ key: 'arena-scene' });
  }

  init() {
    logger.info('Function: init', LogCodes.CLIENT_APPLICATION);
    const protocol = window.location.host.includes('localhost') ? 'ws' : 'wss';
    const endpoint = `${protocol}://${window.location.host}`;
    this.client = new Client(endpoint);

    this.worldEntityMap = {};

    this.inputManager = new InputManager((action: UserActions) => {});
    this.pingManager = new PingManager(true, this);

    this.resize();
    this.scale.on('resize', this.resize.bind(this));
  }

  // -----------------------------------------------------------------------------------------------
  preload() {
    logger.info('Function: preload', LogCodes.CLIENT_APPLICATION);
    this.load.bitmapFont('syne', 'assets/fonts/syne_mono_24/syne_mono_24.png', 'assets/fonts/syne_mono_24/syne_mono_24.xml');
    this.load.bitmapFont('syne', 'assets/fonts/syne_mono_32/syne_mono_32.png', 'assets/fonts/syne_mono_32/syne_mono_32.xml');
    this.load.bitmapFont('syne', 'assets/fonts/syne_mono_64/syne_mono_64.png', 'assets/fonts/syne_mono_64/syne_mono_64.xml');
  }

  // -----------------------------------------------------------------------------------------------
  async create() {
    logger.info('Function: create', LogCodes.CLIENT_APPLICATION);

    this.playarea = this.add.rectangle(0, 0, constants.WORLD_SIZE, constants.WORLD_SIZE, 0x000000).setOrigin(0, 0);
    this.labelPhaseTimer = this.add.bitmapText(constants.WORLD_SIZE, 32, 'syne', '', 24).setOrigin(0, 0);
    this.labelPhaseType = this.add.bitmapText(constants.WORLD_SIZE, 64, 'syne', '', 24).setOrigin(0, 0);

    const playerName = (window as any).custom.name;
    this.room = await this.client.joinOrCreate<ArenaState>(constants.ROOM_NAME, { name: playerName });

    this.pingManager.start(this.room);

    this.room.state.meta.onChange = (dataChanges = []) => {
      dataChanges.forEach((change) => {
        if (change.field === 'phaseElapsedSeconds') {
          this.labelPhaseTimer.text = `${change.value}`;
        } else if (change.field === 'phaseType') {
          this.labelPhaseType.text = `${change.value}`;
        }
      });
    };

    // PLAYERS ------
    this.room.state.players.onAdd = (playerServerEntity, sessionId: string) => {
      logger.info('Player joined the game.', LogCodes.CLIENT_ENTITY_INFO, { ...playerServerEntity });

      const isClient = sessionId === this.room.sessionId;
      const actor = new Actor(this)
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
      const actor = new Actor(this)
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
      const rocket = new Rocket(this)
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
  }

  // -----------------------------------------------------------------------------------------------
  update(time: number, delta: number): void {
    this.inputManager.tick(this.room);

    for (const entityId in this.worldEntityMap) {
      const entity = this.worldEntityMap[entityId].entity;
      entity.onTick(delta);
    }

    this.pingManager.tick();
  }

  // -----------------------------------------------------------------------------------------------
  resize(): void {
    this.cameras.main.setScroll(-(this.scale.width / 2) + (constants.WORLD_SIZE / 2), -(this.scale.height / 2) + (constants.WORLD_SIZE / 2));
  }
}