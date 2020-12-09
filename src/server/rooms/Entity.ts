import { Schema, type } from "@colyseus/schema";

export class Entity extends Schema {
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

    static distance(a: Entity, b: Entity) {
        return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
    }
}