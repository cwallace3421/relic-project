import * as PIXI from "pixi.js";
import * as Viewport from "pixi-viewport";
import { Room, Client } from "colyseus.js";
import { DataChange } from "@colyseus/schema";
import { ArenaState } from "../server/rooms/ArenaState";
import { distance, lerp, normalize } from "../utils/vector";
import { PingPong } from "./PingPong";
import { TimingGraph, TimingEventType } from "./TimingGraph";
import constants from "../utils/constants";
import { Keyboard, UserActions } from "./Keyboard";
import EntityHelper from "./EntityHelper";

const ENDPOINT = (process.env.NODE_ENV !== "production")
  ? "ws://localhost:8080"
  : "production";

enum ServerEntityType {
  PLAYER = "PLAYER",
  BOT = "BOT",
  ROCKET = "ROCKET",
}

interface ServerEntity {
  type: ServerEntityType;
  speed: number;
  positionBuffer: {
    id: number;
    timestamp: number;
    timeElapsed?: number;
    speed?: number;
    x?: number;
    y?: number;
  }[];
  gfx: PIXI.Graphics;
  flag?: boolean;
};

interface ServerEntityMap {
  [id: string]: ServerEntity
};

export class Application extends PIXI.Application {
  serverEntityMap: ServerEntityMap = {};
  clientEntity: ServerEntity;

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

    this.room.state.players.onAdd = (playerEntity, sessionId: string) => {
      const playerGraphics = this.createCircleInViewport(0xFFFF0B, playerEntity.x, playerEntity.y, playerEntity.radius);

      const playerNameText = new PIXI.Text(playerEntity.name, new PIXI.TextStyle({
        fill: "white",
        align: "center",
        fontSize: 12
      }));
      playerNameText.anchor.set(0.5, 1);
      playerNameText.position.set(0, -(playerEntity.radius * 2));
      playerGraphics.addChild(playerNameText);

      this.serverEntityMap[sessionId] = {
        type: ServerEntityType.PLAYER,
        speed: playerEntity.speed,
        gfx: playerGraphics,
        positionBuffer: [],
      };

      // If the local session id is the same as the incoming player entity, we want to store a reference to it.
      // As it's our local player.
      if (sessionId === this.room.sessionId) {
        this.clientEntity = this.serverEntityMap[sessionId];
        // this.viewport.follow(this.clientEntity);
      }

      playerEntity.onChange = (allChanges) => this.onServerEntityChange(sessionId, allChanges);
    };

    this.room.state.players.onRemove = (_, sessionId: string) => {
      const entity = this.serverEntityMap[sessionId];
      if (!!entity && entity.type === ServerEntityType.PLAYER) {
        this.viewport.removeChild(entity.gfx);
        entity.gfx.destroy();
        delete this.serverEntityMap[sessionId];
        console.log("Player left.", { sessionId });
      } else {
        console.error('Attempting to remove player, but they do not exist in the server entity map.', { sessionId });
      }
    };

    this.room.state.bots.onAdd = (botEntity, botId) => {
      const botGraphics = this.createCircleInViewport(0xFF550B, botEntity.x, botEntity.y, botEntity.radius);

      const botNameText = new PIXI.Text(botEntity.name, new PIXI.TextStyle({
        fill: "white",
        align: "center",
        fontSize: 12
      }));
      botNameText.anchor.set(0.5, 1);
      botNameText.position.set(0, -(botEntity.radius * 2));
      botGraphics.addChild(botNameText);

      this.serverEntityMap[botId] = {
        type: ServerEntityType.BOT,
        speed: botEntity.speed,
        gfx: botGraphics,
        positionBuffer: [],
      };

      botEntity.onChange = (allChanges) => this.onServerEntityChange(botId, allChanges);
    };

    this.room.state.bots.onRemove = (_, botId: string) => {
      const entity = this.serverEntityMap[botId];
      if (!!entity && entity.type === ServerEntityType.BOT) {
        this.viewport.removeChild(entity.gfx);
        entity.gfx.destroy();
        delete this.serverEntityMap[botId];
        console.log("Player left.", { botId });
      } else {
        console.error('Attempting to remove bot, but they do not exist in the server entity map.', { botId });
      }
    };

    this.room.state.rockets.onAdd = (rocketEntity, rocketId: string) => {
      const rocketGfx = this.createCircleInViewport(0xFF0000, rocketEntity.x, rocketEntity.y, rocketEntity.radius);

      this.serverEntityMap[rocketId] = {
        type: ServerEntityType.ROCKET,
        speed: rocketEntity.speed,
        gfx: rocketGfx,
        positionBuffer: [],
      };

      rocketEntity.onChange = (allChanges) => this.onServerEntityChange(rocketId, allChanges);
    };

    this.room.state.rockets.onRemove = (_, rocketId: string) => {
      const entity = this.serverEntityMap[rocketId];
      if (!!entity && entity.type === ServerEntityType.ROCKET) {
        this.viewport.removeChild(entity.gfx);
        entity.gfx.destroy();
        delete this.serverEntityMap[rocketId];
      } else {
        console.error('Attempting to remove rocket, but they do not exist in the server entity map.', { rocketId });
      }
    }

    this.pingPong.start(this.room);
  }

  // -----------------------------------------------------------------------------------------------
  tick(deltaTime: number) {
    const _tickComplete = this.timingGraph.addTimingEventCallback(TimingEventType.TICK);

    this.keyboard.tick(this.room, this.timingGraph);

    for (const entityId in this.serverEntityMap) {
      const entity = this.serverEntityMap[entityId];

      const pos = EntityHelper.lerpBetweenPositionBuffers(entity, deltaTime, 0, 1);

      if (pos) {
        entity.gfx.x = pos.x;
        entity.gfx.y = pos.y;
      }
    }

    this.pingPong.tick();
    this.timingGraph.tick();

    _tickComplete();
  }

  // -----------------------------------------------------------------------------------------------
  onServerEntityChange(id: string, allChanges: DataChange<any>[]) {
    /*
    [
        {
            "op": 128,
            "field": "x",
            "value": 813.3449929623681,
            "previousValue": 816.782534408259
        },
        {
            "op": 128,
            "field": "y",
            "value": 499.735169805539,
            "previousValue": 497.692986814771
        }
    ]
    */

    let x: number;
    let y: number;
    let speed: number;

    allChanges.forEach(c => {
      if (c.field === 'x' && c.value) {
        x = c.value;
      } else if (c.field === 'y' && c.value) {
        y = c.value;
      } else if (c.field === 'speed' && c.value) {
        speed = c.value;
      }

    });

    // Only push an entity change to the buffer if the x or y is changing
    // TODO: Obv this won't work if the speed is changing.
    if (x || y) {
      const positionBuffer = this.serverEntityMap[id].positionBuffer;
      const bufferToAdd = { timestamp: performance.now(), speed, x, y, id: Math.floor(Math.random() * 100000) };

      if (positionBuffer.length > 0) {
        const lastAddedBuffer = positionBuffer[positionBuffer.length - 1];
        if (bufferToAdd.timestamp - lastAddedBuffer.timestamp > 80) {
          if (this.serverEntityMap[id].type === ServerEntityType.PLAYER) console.log('TIME DIFF TO PREVIOUSLY ADDED BUFFER', bufferToAdd.timestamp - lastAddedBuffer.timestamp);
          positionBuffer.length = 0;
        }
      }

      positionBuffer.push(bufferToAdd);

      if (this.serverEntityMap[id].type === ServerEntityType.PLAYER) {
        this.timingGraph.addTimingEventInstant(TimingEventType.P_ON_CHANGE);
      }
    }
  }

  // -----------------------------------------------------------------------------------------------
  createCircleInViewport(color: number, x: number, y: number, radius: number): PIXI.Graphics {
    const gfx = new PIXI.Graphics();
    gfx.lineStyle(0);
    gfx.beginFill(color);
    gfx.drawCircle(0, 0, radius);
    gfx.endFill();
    gfx.x = x;
    gfx.y = y;
    this.viewport.addChild(gfx);
    return gfx;
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