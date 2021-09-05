import * as PIXI from "pixi.js";
import type { Room } from "colyseus.js";

interface PingData {
  messageSentToServer: number;
  messageRecievedByServer: number;
  messageSentToClient: number;
  messageRecievedByClient: number;
}

export class PingPong {

  private enabled: boolean = false;

  private pings: PingData[] = [];
  private pingsMaxLength: number = 10;

  private interval: number = 100;

  private stage: PIXI.Container;
  private gfx: PIXI.Text;

  // -----------------------------------------------------------------------------------------------
  constructor(enabled = false, stage: PIXI.Container) {
    this.enabled = enabled;
    this.stage = stage;

    this.init();
  }

  // -----------------------------------------------------------------------------------------------
  private init() {
    if (!this.enabled) return;

    this.gfx = new PIXI.Text(
      this.getGfxText(0, 0),
      new PIXI.TextStyle({
        fill: "white",
        align: "right",
        fontSize: 16
      }),
    );

    this.gfx.anchor.set(1, 0);
    this.gfx.position.set(this.stage.width, 0);
    this.stage.addChild(this.gfx);
  }

  private getGfxText(outgoing: number, incoming: number) {
    return `${outgoing} ms - out\n${incoming} ms - in`
  }

  // -----------------------------------------------------------------------------------------------
  public start(room: Room) {
    if (!this.enabled) return;

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
      this.gfx.text =  this.getGfxText(outgoingAverage, incomingAverage);
    }
  }
}