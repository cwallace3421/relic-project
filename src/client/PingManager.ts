import Phaser from 'phaser';

import type { Room } from "colyseus.js";
import constants from '../utils/constants';

type PingData = {
  messageSentToServer: number;
  messageRecievedByClient: number;
};

export class PingManager {

  private enabled: boolean = false;

  private pings: PingData[] = [];
  private pingsMaxLength: number = 10;
  private isDirty: boolean = false;

  private interval: number = 100;

  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.BitmapText;

  // -----------------------------------------------------------------------------------------------
  constructor(enabled = false, scene: Phaser.Scene) {
    this.enabled = enabled;
    this.scene = scene;

    if (this.enabled) {
      this.init();
    }
  }

  // -----------------------------------------------------------------------------------------------
  private init() {}

  // -----------------------------------------------------------------------------------------------
  public start(room: Room) {
    if (!this.enabled) return;

    this.graphics = this.scene.add.bitmapText(constants.WORLD_SIZE, 0, 'syne', '', 24).setOrigin(0, 0);

    setInterval(() => {
      room.send('ping', {
        messageSentToServer: Date.now(),
        messageRecievedByClient: null,
      });
    }, this.interval);

    room.onMessage('pong', (message: PingData) => {
      message.messageRecievedByClient = Date.now();

      // If there is more than 9 elements in the pings array. Remove the first element so we will have 10 total.
      if (this.pings.length > (this.pingsMaxLength - 1)) {
        this.pings.shift();
      }

      this.pings.push(message);

      this.isDirty = true;
    });
  }

  // -----------------------------------------------------------------------------------------------
  public tick() {
    if (!this.enabled) return;
    if (!this.isDirty) return;
    if (this.pings.length === 0) return;

    const timings = this.pings.map((ping) => ping.messageRecievedByClient - ping.messageSentToServer);
    const average = timings.reduce((p, c) => p + c) / timings.length;
    this.graphics.setText(this.getGfxText(average));

    this.isDirty = false;
  }

  // -----------------------------------------------------------------------------------------------
  private getGfxText(pingMS: number) {
    return `${pingMS.toFixed(2).padEnd(6, '0')} ms`
  }
}