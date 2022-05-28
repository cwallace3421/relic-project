import { Schema, type } from "@colyseus/schema";
import { Victor } from '../../utils/Victor';
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

  @type("boolean")
  frozen: boolean = false;

  @type("float64")
  speed = 0;

  @type("int16")
  difficulty = 0;

  position: Victor = new Victor(0, 0);

  targetPosition: Victor = new Victor(0, 0);

  getPosition(): Victor {
    this.position.x = this.x;
    this.position.y = this.y;
    return this.position;
  }

  getTargetPosition(): Victor {
    this.targetPosition.x = this.targetX;
    this.targetPosition.y = this.targetY;
    return this.targetPosition;
  }

  static setPosition(bot: Bot, position: Victor): void {
    bot.assign({ x: position.x, y: position.y });
  }

  static setPositionXY(bot: Bot, x: number, y: number): void {
    bot.assign({ x, y });
  }

  static setTargetPosition(bot: Bot, position: Victor): void {
    bot.assign({ targetX: position.x, targetY: position.y });
  }

  static setTargetPositionXY(bot: Bot, x: number, y: number): void {
    bot.assign({ targetX: x, targetY: y });
  }

}