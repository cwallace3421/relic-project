import type * as Viewport from "pixi-viewport";
import * as PIXI from "pixi.js";
import { EntityStateChange, _NetworkedEntity } from "./_NetworkedEntity";
import logger, { LogCodes } from "../utils/logger";

export class Rocket extends _NetworkedEntity {

  private id: string;

  private viewport: Viewport;
  private graphics: PIXI.Graphics;

  private speed: number;
  private radius: number;
  private rotation: number;
  private color: number;

  // -----------------------------------------------------------------------------------------------
  constructor (viewport: Viewport) {
    super();

    this.viewport = viewport;
  }

  // -----------------------------------------------------------------------------------------------
  public initMeta(id: string): Rocket {
    this.id = id;

    // if (this.isClient) {
    //   this.viewport.follow(this.graphics);
    // }

    return this;
  }

  // -----------------------------------------------------------------------------------------------
  public initProperties(speed: number): Rocket {
    this.speed = speed;
    return this;
  }

  // -----------------------------------------------------------------------------------------------
  public initGraphics(x: number, y: number, radius: number, color: number): Rocket {
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
      logger.info("Rocket Entity Removed.", LogCodes.CLIENT_ENTITY_INFO, { id: this.id });
    } else {
      logger.info("Trying to remove Rocket Entity with incorrect id.", LogCodes.CLIENT_ENTITY_INFO, { id: this.id, providedId: id });
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
  public setRotation(degrees: number): void {
    this.rotation = degrees;
    this.graphics.angle = degrees;
  }

  // @Override -------------------------------------------------------------------------------------
  public getX(): number {
    return this.graphics.x;
  }

  // @Override -------------------------------------------------------------------------------------
  public getY(): number {
    return this.graphics.y;
  }

  // @Override -------------------------------------------------------------------------------------
  public getRotation(): number {
    return this.rotation;
  }

  // -----------------------------------------------------------------------------------------------
  private createGraphics(x: number, y: number): PIXI.Graphics {
    const gfx = new PIXI.Graphics();
    gfx.lineStyle(0);
    gfx.beginFill(this.color);
    gfx.drawCircle(0, 0, this.radius);
    gfx.drawRect(0, -(this.radius / 2), this.radius * 3, this.radius);
    gfx.endFill();
    gfx.x = x;
    gfx.y = y;
    this.viewport.addChild(gfx);
    return gfx;
  }
}