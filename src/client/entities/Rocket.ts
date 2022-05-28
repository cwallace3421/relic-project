import Phaser from 'phaser';
import { _NetworkedEntity } from "./base/_NetworkedEntity";
import logger, { LogCodes } from "../../utils/logger";

export class Rocket extends _NetworkedEntity {

  private id: string;

  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;

  private speed: number;
  private radius: number;
  private rotation: number;
  private color: number;

  // -----------------------------------------------------------------------------------------------
  constructor (scene: Phaser.Scene) {
    super();
    this.scene = scene;
  }

  // -----------------------------------------------------------------------------------------------
  public initMeta(id: string): Rocket {
    this.id = id;
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
    this.createGraphics(x, y);
    return this;
  }

  // @Override -------------------------------------------------------------------------------------
  public onTick(deltaTime: number) {
    super.onTick(deltaTime);
  }

  // @Override -------------------------------------------------------------------------------------
  public onEntityRemove(id: string): void {
    if (id === this.id) {
      this.container.destroy();
      delete this.container;
      logger.info("Rocket Entity Removed.", LogCodes.CLIENT_ENTITY_INFO, { id: this.id });
    } else {
      logger.info("Trying to remove Rocket Entity with incorrect id.", LogCodes.CLIENT_ENTITY_INFO, { id: this.id, providedId: id });
    }
  }

  // @Override -------------------------------------------------------------------------------------
  public setX(x: number): void {
    this.container.x = x;
  }

  // @Override -------------------------------------------------------------------------------------
  public setY(y: number): void {
    this.container.y = y;
  }

  // @Override -------------------------------------------------------------------------------------
  public setRotation(degrees: number): void {
    this.rotation = degrees;
    this.container.angle = degrees;
  }

  // @Override -------------------------------------------------------------------------------------
  public getX(): number {
    return this.container.x;
  }

  // @Override -------------------------------------------------------------------------------------
  public getY(): number {
    return this.container.y;
  }

  // @Override -------------------------------------------------------------------------------------
  public getRotation(): number {
    return this.rotation;
  }

  // -----------------------------------------------------------------------------------------------
  private createGraphics(x: number, y: number): void {
    const circle = this.scene.add.ellipse(0, 0, this.radius * 2, this.radius * 2, this.color);
    const nozzle = this.scene.add.rectangle(0, 0, this.radius * 1.5, this.radius, this.color).setOrigin(0, 0.5);
    this.container = this.scene.add.container(x, y, [circle, nozzle]);
  }
}