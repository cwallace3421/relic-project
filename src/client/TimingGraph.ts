import * as PIXI from "pixi.js";

export enum TimingEventType {
  P_ON_CHANGE = "P_ON_CHANGE",
  P_UPDATE = "P_UPDATE",
  SEND_KEYBOARD = "SEND_KEYBOARD",
  TICK = "TICK",
}

interface TimingEvent {
  start: number;
  end: number;
  type: TimingEventType;
}

export class TimingGraph {

  private enabled: boolean = false;
  private events: TimingEvent[] = [];
  private eventsMaxLength: number = 400;

  private stage: PIXI.Container;
  private graphGfx: PIXI.Graphics;
  private graphScale: number = 1;

  // -----------------------------------------------------------------------------------------------
  constructor(enabled = false, stage: PIXI.Container) {
    this.enabled = enabled;
    this.stage = stage;
  }

  // -----------------------------------------------------------------------------------------------
  public addTimingEvent(start: number, type: TimingEventType) {
    if (!this.enabled) return;

    if (this.events.length + 1 > this.eventsMaxLength) {
      this.events.length = 0;
    }

    const now = Date.now();
    this.events.push({
      start: start || now,
      end: now,
      type,
    });
  }

  // -----------------------------------------------------------------------------------------------
  public changeGraphScale(amount: number) {
    if (Math.sign(amount) > 0) { // Positive
      this.graphScale = Math.min(10, this.graphScale + amount);
    }
    if (Math.sign(amount) < 0) { // Negative
      this.graphScale = Math.max(1, this.graphScale + amount);
    }
  }

  // -----------------------------------------------------------------------------------------------
  public tick() {
    if (!this.enabled) return;

    if (!this.graphGfx) {
      this.graphGfx = new PIXI.Graphics();
      this.graphGfx.height = 300;
      this.graphGfx.width = this.stage.width;
      this.graphGfx.position.set(0, this.stage.height - this.graphGfx.height);
      this.stage.addChild(this.graphGfx);
    }

    this.graphGfx.clear();

    let beginTime = 0;
    let timePassed = 0;
    let lineHeight = 20;
    let color = 0xffffff;
    let scale = this.graphScale;
    for (let i = 0; i < this.events.length; i++) {
      const e = this.events[i];
      if (i === 0) {
        beginTime = e.start;
      }
      timePassed = e.start - beginTime;
      switch (e.type) {
        case TimingEventType.P_ON_CHANGE:
          lineHeight = 3;
          color = 0xcaff9e;
          break;
        case TimingEventType.P_UPDATE:
          lineHeight = 2;
          color = 0x91fffb;
          break;
        case TimingEventType.SEND_KEYBOARD:
          lineHeight = 1;
          color = 0xf3ff96;
          break;
        case TimingEventType.TICK:
        default:
          lineHeight = 0;
          color = 0xffffff;
      }
      const len = Math.max(1, e.end - beginTime);
      this.graphGfx.lineStyle(12, color, 1, 1)
        .moveTo(timePassed * scale, 270 - (12 * lineHeight))
        .lineTo(len * scale, 270 - (12 * lineHeight));
    }

    this.graphGfx.lineStyle(1, 0xc9c9c9, 1)
        .moveTo(0, 270)
        .lineTo(window.innerWidth, 270);
    for (let i = 0; i < Math.floor(window.innerWidth / 10); i++) {
      this.graphGfx.lineStyle(1, 0xc9c9c9, 0)
        .moveTo((10 * i) * scale, 270)
        .lineTo((10 * i) * scale, 290);
    }
  }
}