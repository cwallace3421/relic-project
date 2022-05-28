import Phaser from 'phaser';
import { EntityStateChange, _NetworkedEntity } from "./base/_NetworkedEntity";
import logger, { LogCodes } from "../../utils/logger";
import constants from '../../utils/constants';

export enum ActorType {
  PLAYER = "PLAYER",
  BOT = "BOT"
};

export class Actor extends _NetworkedEntity {

  private type: ActorType;
  private id: string;
  private name: string;
  private isClient: boolean;

  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;

  private speed: number;
  private radius: number;
  private color: number;

  // -----------------------------------------------------------------------------------------------
  constructor (scene: Phaser.Scene) {
    super();
    this.scene = scene;
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
      logger.info("Actor Entity Removed.", LogCodes.CLIENT_ENTITY_INFO, { id: this.id });
    } else {
      logger.info("Trying to remove Actor Entity with incorrect id.", LogCodes.CLIENT_ENTITY_INFO, { id: this.id, providedId: id });
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
  public setRotation(degrees: number): void { }

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
    return NaN;
  }

  // @Override -------------------------------------------------------------------------------------
  public onTickDataChange(change: EntityStateChange): void {

  }

  // -----------------------------------------------------------------------------------------------
  public getIsClient(): boolean {
    return this.isClient;
  }

  // -----------------------------------------------------------------------------------------------
  private createGraphics(x: number, y: number): void {
    const circle = this.scene.add.ellipse(0, 0, this.radius * 2, this.radius * 2, this.color);
    this.container = this.scene.add.container(x, y, [circle]);

    if (this.isClient) {
      const deflect = this.scene.add.ellipse(0, 0, constants.DEFLECT_RADIUS * 2, constants.DEFLECT_RADIUS * 2, 0xffffff, 0.1);
      this.container.add(deflect);
    }

    const nameplate = this.scene.add.text(0, -(this.radius * 2) ,this.name, {
      color: "rgb(255,255,255)",
      align: "center",
      fontSize: '12'
    }).setOrigin(0.5, 0.5);

    this.container.add(nameplate);
  }

}