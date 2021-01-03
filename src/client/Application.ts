import * as PIXI from "pixi.js";
import * as Viewport from "pixi-viewport";
import { Room, Client } from "colyseus.js";
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

interface ServerEntityMap {
  [id: string]: PIXI.Graphics;
};

interface KeyboardState {
  isUpPressed: boolean;
  isDownPressed: boolean;
  isLeftPressed: boolean;
  isRightPressed: boolean;
  isDirty: boolean;
};

export class Application extends PIXI.Application {
  serverPlayerMap: ServerEntityMap = {};
  serverRocketMap: ServerEntityMap = {};
  clientEntity: PIXI.Graphics;

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

    this.room.state.players.onAdd = (entity, sessionId: string) => {
      const color = 0xFFFF0B;

      const playerNameText = new PIXI.Text(entity.name, new PIXI.TextStyle({
        fill: "white",
        align: "center",
        fontSize: 12
      }));
      playerNameText.anchor.set(0.5, 1);
      playerNameText.position.set(0, -(entity.radius * 2));

      const playerGraphics = new PIXI.Graphics();
      playerGraphics.lineStyle(0);
      playerGraphics.beginFill(color);
      playerGraphics.drawCircle(0, 0, entity.radius);
      playerGraphics.endFill();

      playerGraphics.x = entity.x;
      playerGraphics.y = entity.y;

      playerGraphics.addChild(playerNameText);

      this.viewport.addChild(playerGraphics);

      this.serverPlayerMap[sessionId] = playerGraphics;

      // detecting current user
      if (sessionId === this.room.sessionId) {
        this.clientEntity = playerGraphics;
        // this.viewport.follow(this.clientEntity);
      }
    };

    this.room.state.players.onRemove = (_, sessionId: string) => {
      console.log("Player left.", { sessionId });
      this.viewport.removeChild(this.serverPlayerMap[sessionId]);
      this.serverPlayerMap[sessionId].destroy();
      delete this.serverPlayerMap[sessionId];
    };

    this.room.state.rockets.onAdd = (rocket, rocketId: string) => {
      const gfx = new PIXI.Graphics();

      gfx.lineStyle(0);
      gfx.beginFill(0xFF0000);
      gfx.drawCircle(0, 0, rocket.radius);
      gfx.endFill();

      gfx.x = rocket.x;
      gfx.y = rocket.y;

      this.viewport.addChild(gfx);
      this.serverRocketMap[rocketId] = gfx;
    };

    this.room.state.rockets.onRemove = (_, rocketId: string) => {
      this.viewport.removeChild(this.serverRocketMap[rocketId]);
      this.serverRocketMap[rocketId].destroy();
      delete this.serverRocketMap[rocketId];
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

    for (let id in this.serverPlayerMap) {
      ({ x: oldX, y: oldY } = this.serverPlayerMap[id]);
      ({ x: targetX, y: targetY } = this.room.state.players.get(id));

      newPos = lerp(oldX, oldY, targetX, targetY, 0.2, 0.1);
      this.serverPlayerMap[id].x = newPos.x;
      this.serverPlayerMap[id].y = newPos.y
    }

    for (let id in this.serverRocketMap) {
      ({ x: oldX, y: oldY } = this.serverRocketMap[id]);
      ({ x: targetX, y: targetY } = this.room.state.rockets.get(id));

      newPos = lerp(oldX, oldY, targetX, targetY, 0.2, 0.1);
      this.serverRocketMap[id].x = newPos.x;
      this.serverRocketMap[id].y = newPos.y;
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