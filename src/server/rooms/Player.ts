import { Schema, type } from "@colyseus/schema";
import { Victor } from '../../utils/Victor';
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

  interactedPressedTime: number = 0;

  position: Victor = new Victor(0, 0);

  getPosition(): Victor {
    this.position.x = this.x;
    this.position.y = this.y;
    return this.position;
  }

  static setPosition(player: Player, position: Victor): void {
    player.assign({ x: position.x, y: position.y });
  }

  static setPositionXY(player: Player, x: number, y: number): void {
    player.assign({ x, y });
  }

}