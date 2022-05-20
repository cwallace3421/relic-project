import { Schema, type } from "@colyseus/schema";
import constants from "../../utils/constants";

export class Player extends Schema {
    @type("string")
    id!: string;

    @type("string")
    name!: string;

    @type("float64")
    x!: number;

    @type("float64")
    y!: number;

    @type("float32")
    radius: number = constants.PLAYER_RADIUS;

    @type("boolean")
    isUpPressed: boolean = false;

    @type("boolean")
    isDownPressed: boolean = false;

    @type("boolean")
    isLeftPressed: boolean = false;

    @type("boolean")
    isRightPressed: boolean = false;

    @type("boolean")
    isInteractPressed: boolean = false;

    @type("boolean")
    dead: boolean = false;

    @type("float64")
    speed = 0;

    static distance(a: Player, b: Player) {
        return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
    }
}