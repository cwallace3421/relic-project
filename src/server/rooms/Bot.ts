import { Schema, type } from "@colyseus/schema";
import constants from "../../utils/constants";

export class Bot extends Schema {
    @type("string")
    id!: string;

    @type("string")
    name!: string;

    @type("float64")
    x!: number;

    @type("float64")
    y!: number;

    @type("float64")
    targetX!: number;

    @type("float64")
    targetY!: number;

    @type("float32")
    radius: number = constants.PLAYER_RADIUS;

    @type("boolean")
    dead: boolean = false;

    @type("float64")
    speed = 0;

    @type("int16")
    difficulty = 0;
}