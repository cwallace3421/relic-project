import { Schema, type } from "@colyseus/schema";
import { Victor } from '../../utils/Victor';
import constants from "../../utils/constants";

export class Rocket extends Schema {
  @type("string")
  id!: string;

  @type("string")
  targetId!: string;

  @type("float64")
  x!: number;

  @type("float64")
  y!: number;

  @type("float64")
  directionX!: number;

  @type("float64")
  directionY!: number;

  @type("float32")
  radius: number = constants.ROCKET_RADIUS;

  @type("float64")
  speed = 0;

  @type("boolean")
  active: boolean = false;

  position: Victor = new Victor(0, 0);

  getPosition(): Victor {
    this.position.x = this.x;
    this.position.y = this.y;
    return this.position;
  }

  static setPosition(rocket: Rocket, position: Victor): void {
    rocket.assign({ x: position.x, y: position.y });
  }

  static setPositionXY(rocket: Rocket, x: number, y: number): void {
    rocket.assign({ x, y });
  }

}