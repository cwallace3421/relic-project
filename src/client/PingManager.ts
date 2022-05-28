import Phaser from 'phaser';

import type { Room } from "colyseus.js";
import constants from '../utils/constants';

type PingData = {
  messageSentToServer: number;
  messageRecievedByServer: number;
  messageSentToClient: number;
  messageRecievedByClient: number;
};

export class PingManager {

  private enabled: boolean = false;

  private pings: PingData[] = [];
  private pingsMaxLength: number = 10;

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
  private init() {
    // this.graphics = this.scene.add.text(0, 0 , '', {
    //   color: "rgb(255,255,255)",
    //   align: "right",
    //   fontSize: '12'
    // }).setOrigin(1, 0);
  }

  private getGfxText(outgoing: number, incoming: number) {
    return `${outgoing.toString().padEnd(5)} ms - out\n${incoming.toString().padEnd(5)} ms - in`
  }

  // -----------------------------------------------------------------------------------------------
  public start(room: Room) {
    if (!this.enabled) return;

    this.graphics = this.scene.add.bitmapText(constants.WORLD_SIZE, 0, 'syne', '', 24).setOrigin(0, 0);

    setInterval(() => {
      room.send('ping', {
        messageSentToServer: Date.now(),
        messageRecievedByServer: null,
        messageSentToClient: null,
        messageRecievedByClient: null
      });
    }, this.interval);

    room.onMessage('pong', (message: PingData) => {
      message.messageRecievedByClient = Date.now();

      // If there is more than 9 elements in the pings array. Remove the first element so we will have 10 total.
      if (this.pings.length > (this.pingsMaxLength - 1)) {
        this.pings.shift();
      }

      this.pings.push(message);
    });
  }

  // -----------------------------------------------------------------------------------------------
  public tick() {
    if (!this.enabled) return;

    if (this.pings.length === this.pingsMaxLength) {
      const outgoing: Array<number> = this.pings.map((ping) => ping.messageRecievedByServer - ping.messageSentToServer);
      const incoming: Array<number> = this.pings.map((ping) => ping.messageRecievedByClient - ping.messageSentToClient);
      const outgoingAverage = outgoing.reduce((p, c) => p + c) / this.pingsMaxLength;
      const incomingAverage = incoming.reduce((p, c) => p + c) / this.pingsMaxLength;
      this.graphics.setText(this.getGfxText(outgoingAverage, incomingAverage));
    }
  }
}