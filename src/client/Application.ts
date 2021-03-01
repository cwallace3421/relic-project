import * as PIXI from "pixi.js";
import * as Viewport from "pixi-viewport";
import { Room, Client } from "colyseus.js";
import { DataChange } from "@colyseus/schema";
import { ArenaState } from "../server/rooms/ArenaState";
import constants from "../utils/constants";
import { lerp } from "../utils/vector";

const ENDPOINT = (process.env.NODE_ENV !== "production")
  ? "ws://localhost:8080"
  : "production";

const keyboardKeyToStateMap = {
  "w": "isUpPressed",
  "s": "isDownPressed",
  "a": "isLeftPressed",
  "d": "isRightPressed"
};
const moveKeys = Object.keys(keyboardKeyToStateMap);

enum ServerEntityType {
  PLAYER = "PLAYER",
  BOT = "BOT",
  ROCKET = "ROCKET",
}

interface ServerEntity {
  type: ServerEntityType;
  speed: number;
  positionBuffer: {
    timestamp: number;
    speed?: number;
    x?: number;
    y?: number;
  }[];
  gfx: PIXI.Graphics;
};

interface ServerEntityMap {
  [id: string]: ServerEntity
};

interface KeyboardState {
  isUpPressed: boolean;
  isDownPressed: boolean;
  isLeftPressed: boolean;
  isRightPressed: boolean;
  isDirty: boolean;
};

export class Application extends PIXI.Application {
  serverEntityMap: ServerEntityMap = {};
  clientEntity: ServerEntity;

  client: Client = new Client(ENDPOINT);
  room: Room<ArenaState>;

  viewport: Viewport;

  keyboardState: KeyboardState;

  pingArray: Array<{
    messageSentToServer: number,
    messageRecievedByServer: number,
    messageSentToClient: number,
    messageRecievedByClient: number
  }>;
  pingText: PIXI.Text;

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
    const boundaries = new PIXI.Graphics();
    boundaries.beginFill(0x000000);
    boundaries.drawRoundedRect(0, 0, constants.WORLD_SIZE, constants.WORLD_SIZE, 30);
    this.viewport.addChild(boundaries);

    // add viewport to stage
    this.stage.addChild(this.viewport);

    this.authenticate();

    this.ticker.add(this.tick.bind(this));

    this.pingArray = [];

    this.pingText = new PIXI.Text(`${0} ms - out\n${0} ms - in`, new PIXI.TextStyle({
      fill: "white",
      align: "right",
      fontSize: 16
    }));
    this.pingText.anchor.set(1, 0);
    this.pingText.position.set(this.stage.width, 0);
    this.stage.addChild(this.pingText);

    // this.interpolation = false;

    this.keyboardState = {
      isUpPressed: false,
      isDownPressed: false,
      isLeftPressed: false,
      isRightPressed: false,
      isDirty: false
    };

    window.addEventListener("keydown", (e: KeyboardEvent) => {
      if (moveKeys.includes(e.key)) {
        const stateKey = keyboardKeyToStateMap[e.key];
        if (this.keyboardState[stateKey] === false) {
          this.keyboardState.isDirty = true;
          this.keyboardState[stateKey] = true;
        }
        // If it's not false that means it's true already so we don't need to set the dirty flag.
      }
    });

    window.addEventListener("keyup", (e: KeyboardEvent) => {
      if (moveKeys.includes(e.key)) {
        const stateKey = keyboardKeyToStateMap[e.key];
        if (this.keyboardState[stateKey] === true) {
          this.keyboardState.isDirty = true;
          this.keyboardState[stateKey] = false;
        }
        // If it's not true that means it's false already so we don't need to set the dirty flag.
      }
    });
  }

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

    // Ping Pong
    {
      setInterval(() => {
        this.room.send('ping', {
          messageSentToServer: Date.now(),
          messageRecievedByServer: null,
          messageSentToClient: null,
          messageRecievedByClient: null
        });
      }, 100);

      this.room.onMessage('pong', (message) => {
        message.messageRecievedByClient = Date.now();

        this.pingArray.push(message);
        if (this.pingArray.length > 10) {
          // remove first element of array, so we only have at max 10 elements in the array.
          this.pingArray.shift();
        }
      });
    }
  }

  tick(delta: number) {
    if (this.keyboardState.isDirty) {
      console.log('Send Keyboard State', this.keyboardState);
      const { isDirty, ...state } = this.keyboardState;
      this.room.send('keyboard', state);
      this.keyboardState.isDirty = false;
    }

    let oldX = 0, oldY = 0;
    let targetX = 0, targetY = 0;
    let newPos = { x: 0, y: 0 };
    let entity: ServerEntity = null;

    // Interpolate the server entities
    for (let id in this.serverEntityMap) {
      entity = this.serverEntityMap[id];

      oldX = entity.gfx.x;
      oldY = entity.gfx.y;

      if (entity.type === ServerEntityType.PLAYER) {
        const playerState = this.room.state.players.get(id);
        targetX = playerState.x;
        targetY = playerState.y;
      }
      else if (entity.type === ServerEntityType.BOT) {
        const botState = this.room.state.bots.get(id);
        targetX = botState.x;
        targetY = botState.y;
      }
      else if (entity.type === ServerEntityType.ROCKET) {
        const rocketState = this.room.state.rockets.get(id);
        targetX = rocketState.x;
        targetY = rocketState.y;
      }

      newPos = lerp(oldX, oldY, targetX, targetY, 0.2, 0.1);
      entity.gfx.x = newPos.x;
      entity.gfx.y = newPos.y;
    }

    // Calculate average ping for outgoing and incoming packets
    {
      if (this.pingArray.length === 10) {
        const outgoing: Array<number> = this.pingArray.map((ping) => ping.messageRecievedByServer - ping.messageSentToServer);
        const incoming: Array<number> = this.pingArray.map((ping) => ping.messageRecievedByClient - ping.messageSentToClient);
        const outgoingAverage = outgoing.reduce((p, c) => p + c) / 10;
        const incomingAverage = incoming.reduce((p, c) => p + c) / 10;
        this.pingText.text = `${outgoingAverage} ms - out\n${incomingAverage} ms - in`;
      }
    }
  }

  onServerEntityChange(id: string, allChanges: DataChange<any>[]) {
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

    // if (x || y) {
    //   this.serverEntityMap[id]
    //     .positionBuffer.push({
    //       timestamp: Date.now(),
    //       speed,
    //       x,
    //       y
    //     });
    // }
  }

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

  // set interpolation (bool: boolean) {
  //     this._interpolation = bool;

  //     if (this._interpolation) {
  //         this.loop();
  //     }
  // }

  // loop () {
  //     for (let id in this.entities) {
  //         this.entities[id].x = lerp(this.entities[id].x, this.room.state.entities[id].x, 0.2);
  //         this.entities[id].y = lerp(this.entities[id].y, this.room.state.entities[id].y, 0.2);
  //     }

  //     // continue looping if interpolation is still enabled.
  //     if (this._interpolation) {
  //         requestAnimationFrame(this.loop.bind(this));
  //     }
  // }
}

const lerp_old = (a: number, b: number, t: number) => (b - a) * t + a;