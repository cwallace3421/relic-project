import * as PIXI from "pixi.js";
import * as Viewport from "pixi-viewport";
import { Room, Client } from "colyseus.js";
import { ArenaState } from "../server/rooms/ArenaState";
import constants from "../utils/constants";

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
  serverRocket: PIXI.Graphics;
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

      const graphics = new PIXI.Graphics();
      graphics.lineStyle(0);
      graphics.beginFill(color);
      graphics.drawCircle(0, 0, entity.radius);
      graphics.endFill();

      graphics.x = entity.x;
      graphics.y = entity.y;

      graphics.addChild(playerNameText);

      this.viewport.addChild(graphics);

      this.serverPlayerMap[sessionId] = graphics;

      // detecting current user
      if (sessionId === this.room.sessionId) {
        this.clientEntity = graphics;
        // this.viewport.follow(this.clientEntity);
      }

      // entity.onChange = (changes) => {
      // console.log("Player update.", { sessionId });
      // const color = 0xFFFF0B;

      // const graphics = this.serverPlayerMap[sessionId];
      // graphics.x = entity.x;
      // graphics.y = entity.y;

      // graphics.clear();
      // graphics.lineStyle(0);
      // graphics.beginFill(color, 0.5);
      // graphics.drawCircle(0, 0, entity.radius);
      // graphics.endFill();
      // }
    };

    this.room.state.players.onRemove = (_, sessionId: string) => {
      console.log("Player left.", { sessionId });
      this.viewport.removeChild(this.serverPlayerMap[sessionId]);
      this.serverPlayerMap[sessionId].destroy();
      delete this.serverPlayerMap[sessionId];
    };

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
    for (let id in this.serverPlayerMap) {
      ({ x: oldX, y: oldY } = this.serverPlayerMap[id]);
      ({ x: targetX, y: targetY } = this.room.state.players.get(id));

      const xDiff = Math.abs(targetX - oldX);
      const yDiff = Math.abs(targetY - oldY);

      if (xDiff > 15 || yDiff > 15) {
        // This threshold was randomly chosen, just to make sure that the difference isn't growing. And the the lerp is keeping up mostly.
        console.error('Lerping is not catching up', {xDiff, yDiff});
      }

      // Where do we get the lerp t value of 0.2 from? The t value is a percentage of the difference. 0.5 = move 50% between the current and target.

      if (xDiff < 0.1) {
        this.serverPlayerMap[id].x = targetX;
      } else {
        this.serverPlayerMap[id].x = lerp(oldX, targetX, 0.2);
      }

      if (yDiff < 0.1) {
        this.serverPlayerMap[id].y = targetY;
      } else {
        this.serverPlayerMap[id].y = lerp(oldY, targetY, 0.2);
      }
    }

    // Calculate average ping for outgoing and incoming packets
    if (this.pingArray.length === 10) {
      const outgoing: Array<number> = this.pingArray.map((ping) => ping.messageRecievedByServer - ping.messageSentToServer);
      const incoming: Array<number> = this.pingArray.map((ping) => ping.messageRecievedByClient - ping.messageSentToClient);
      const outgoingAverage = outgoing.reduce((p, c) => p + c) / 10;
      const incomingAverage = incoming.reduce((p, c) => p + c) / 10;
      this.pingText.text = `${outgoingAverage} ms - out\n${incomingAverage} ms - in`;
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

export const lerp = (a: number, b: number, t: number) => (b - a) * t + a;