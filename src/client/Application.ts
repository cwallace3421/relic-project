import * as PIXI from "pixi.js";
import * as Viewport from "pixi-viewport";
import { Room, Client } from "colyseus.js";
import { ArenaState } from "../server/rooms/ArenaState";

const ENDPOINT = (process.env.NODE_ENV !== "production")
    ? "ws://localhost:8080"
    : "production";

const WORLD_SIZE = 500;
const ROOM_NAME = "arena";

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
    serverEntityMap: ServerEntityMap = {};
    clientEntity: PIXI.Graphics;

    client: Client = new Client(ENDPOINT);
    room: Room<ArenaState>;

    viewport: Viewport;

    keyboardState: KeyboardState;

    constructor () {
        super({
            width: window.innerWidth,
            height: window.innerHeight,
            backgroundColor: 0x0c0c0c
        });

        this.viewport = new Viewport({
            screenWidth: window.innerWidth,
            screenHeight: window.innerHeight,
            worldWidth: WORLD_SIZE,
            worldHeight: WORLD_SIZE,
        });

        // draw boundaries of the world
        const boundaries = new PIXI.Graphics();
        boundaries.beginFill(0x000000);
        boundaries.drawRoundedRect(0, 0, WORLD_SIZE, WORLD_SIZE, 30);
        this.viewport.addChild(boundaries);

        // add viewport to stage
        this.stage.addChild(this.viewport);

        this.authenticate();

        this.ticker.add(this.tick.bind(this));

        // this.interpolation = false;

        this.keyboardState = {
            isUpPressed: false,
            isDownPressed: false,
            isLeftPressed: false,
            isRightPressed: false,
            isDirty: false
        };

        window.addEventListener("keydown", (e: KeyboardEvent) => {
            console.log(e.key);
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
                // If it's not false that means it's true already so we don't need to set the dirty flag.
            }
        });

        // this.viewport.on("mousemove", (e) => {
        //     if (this.clientEntity) {
        //         const point = this.viewport.toLocal(e.data.global);
        //         this.room.send('mouse', { x: point.x, y: point.y });
        //     }
        // });
    }

    async authenticate() {
        // anonymous auth for social
        // await this.client.auth.login();

        // console.log("Success!", this.client.auth);

        const playerName = (window as any).custom.name;
        this.room = await this.client.joinOrCreate<ArenaState>(ROOM_NAME, { name: playerName });

        this.room.state.entities.onAdd = (entity, sessionId: string) => {
            const color = 0xFFFF0B;

            const graphics = new PIXI.Graphics();
            graphics.lineStyle(0);
            graphics.beginFill(color);
            graphics.drawCircle(0, 0, entity.radius);
            graphics.endFill();

            graphics.x = entity.x;
            graphics.y = entity.y;
            this.viewport.addChild(graphics);

            this.serverEntityMap[sessionId] = graphics;

            // detecting current user
            if (sessionId === this.room.sessionId) {
                this.clientEntity = graphics;
                // this.viewport.follow(this.clientEntity);
            }

            entity.onChange = (changes) => {
                const color = 0xFFFF0B;

                const graphics = this.serverEntityMap[sessionId];
                graphics.x = entity.x;
                graphics.y = entity.y;

                // graphics.clear();
                // graphics.lineStyle(0);
                // graphics.beginFill(color, 0.5);
                // graphics.drawCircle(0, 0, entity.radius);
                // graphics.endFill();
            }
        };

        this.room.state.entities.onRemove = (_, sessionId: string) => {
            this.viewport.removeChild(this.serverEntityMap[sessionId]);
            this.serverEntityMap[sessionId].destroy();
            delete this.serverEntityMap[sessionId];
        };
    }

    tick(delta: number) {
        if (this.keyboardState.isDirty) {
            console.log('Send Keyboard State', this.keyboardState);
            const { isDirty, ...state } = this.keyboardState;
            this.room.send('keyboard', state);
            this.keyboardState.isDirty = false;
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