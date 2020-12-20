import { Schema, type } from "@colyseus/schema";
import { DEFAULT_PLAYER_RADIUS } from "./ArenaState";

export class Player extends Schema {
    @type("float64")
    x!: number;

    @type("float64")
    y!: number;

    @type("float32")
    radius!: number;

    @type("boolean")
    isUpPressed: boolean = false;

    @type("boolean")
    isDownPressed: boolean = false;

    @type("boolean")
    isLeftPressed: boolean = false;

    @type("boolean")
    isRightPressed: boolean = false;

    @type("boolean")
    dead: boolean = false;

    @type("float64")
    speed = 0;

    constructor() {
        super();
        this.radius = DEFAULT_PLAYER_RADIUS;
    }

    static distance(a: Player, b: Player) {
        return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
    }
}