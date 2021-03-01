import { Schema, type } from "@colyseus/schema";
import constants from "../../utils/constants";

export class Rocket extends Schema {
    @type("float64")
    x!: number;

    @type("float64")
    y!: number;

    @type("float32")
    radius: number = constants.ROCKET_RADIUS;

    @type("float64")
    speed = 0;

    @type("string")
    targetId!: string;

    @type("boolean")
    active: boolean = false;

    static distance(a: Rocket, b: Rocket) {
        return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
    }
}