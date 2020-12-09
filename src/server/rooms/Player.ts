import { Entity } from "./Entity";
import { DEFAULT_PLAYER_RADIUS } from "./ArenaState";

export class Player extends Entity {
    constructor() {
        super();
        this.radius = DEFAULT_PLAYER_RADIUS;
    }
}