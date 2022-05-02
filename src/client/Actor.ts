import type * as Viewport from "pixi-viewport";
import * as PIXI from "pixi.js";
import { _NetworkedEntity } from "./_NetworkedEntity";
import logger, { LogCodes } from "../utils/logger";

export enum ActorType {
  PLAYER = "PLAYER",
  BOT = "BOT"
};

export class Actor extends _NetworkedEntity {

  private type: ActorType;
  private id: string;
  private name: string;
  private isClient: boolean;

  private viewport: Viewport;
  private graphics: PIXI.Graphics;

  private speed: number;
  private radius: number;
  private color: number;

  // -----------------------------------------------------------------------------------------------
  constructor (viewport: Viewport) {
    super();

    this.viewport = viewport;
  }

  // -----------------------------------------------------------------------------------------------
  public initMeta(type: ActorType, isClient: boolean, id: string, name: string): Actor {
    this.type = type;
    this.id = id;
    this.name = name;
    this.isClient = isClient;
    return this;
  }

  // -----------------------------------------------------------------------------------------------
  public initProperties(speed: number): Actor {
    this.speed = speed;
    return this;
  }

  // -----------------------------------------------------------------------------------------------
  public initGraphics(x: number, y: number, radius: number, color: number): Actor {
    this.radius = radius;
    this.color = color;
    this.graphics = this.createGraphics(x, y);
    return this;
  }

  // @Override -------------------------------------------------------------------------------------
  public onTick(deltaTime: number) {
    super.onTick(deltaTime);
  }

  // @Override -------------------------------------------------------------------------------------
  public onEntityRemove(id: string): void {
    if (id === this.id) {
      this.viewport.removeChild(this.graphics);
      this.graphics.destroy();
      logger.info("Actor Entity Removed.", LogCodes.CLIENT_ENTITY_INFO, { id: this.id });
    } else {
      logger.info("Trying to remove Actor Entity with incorrect id.", LogCodes.CLIENT_ENTITY_INFO, { id: this.id, providedId: id });
    }
  }

  // @Override -------------------------------------------------------------------------------------
  public setX(x: number): void {
    this.graphics.x = x;
  }

  // @Override -------------------------------------------------------------------------------------
  public setY(y: number): void {
    this.graphics.y = y;
  }

  // @Override -------------------------------------------------------------------------------------
  public getX(): number {
    return this.graphics.x;
  }

  // @Override -------------------------------------------------------------------------------------
  public getY(): number {
    return this.graphics.y;
  }

  // -----------------------------------------------------------------------------------------------
  public getIsClient(): boolean {
    return this.isClient;
  }

  // -----------------------------------------------------------------------------------------------
  private createGraphics(x: number, y: number): PIXI.Graphics {
    const gfx = new PIXI.Graphics();
    gfx.lineStyle(0);
    gfx.beginFill(this.color);
    gfx.drawCircle(0, 0, this.radius);
    gfx.endFill();
    gfx.x = x;
    gfx.y = y;
    this.viewport.addChild(gfx);

    const textStyle = new PIXI.TextStyle({
      fill: "white",
      align: "center",
      fontSize: 12
    });

    const text = new PIXI.Text(this.name, textStyle);
    text.anchor.set(0.5, 1);
    text.position.set(0, -(this.radius * 2));

    gfx.addChild(text);

    return gfx;
  }

}