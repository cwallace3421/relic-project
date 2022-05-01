import * as PIXI from "pixi.js";
import constants from "../utils/constants";

export enum TimingEventType {
  P_ON_CHANGE = "P_ON_CHANGE",
  P_UPDATE = "P_UPDATE",
  SEND_USER_ACTION = "SEND_USER_ACTION",
  TICK = "TICK",
}

interface TimingEvent {
  start: number;
  end: number;
  type: TimingEventType;
}

const GraphDisplayConfig = {
  [TimingEventType.TICK]: {
    color: 0xffffff,
    name: 'TICK',
    order: 1,
  },
  [TimingEventType.SEND_USER_ACTION]: {
    color: 0x00ffee,
    name: 'USER ACTION',
    order: 2,
  },
  [TimingEventType.P_UPDATE]: {
    color: 0xff1447,
    name: 'PLAYER UPDATE',
    order: 3,
  },
  [TimingEventType.P_ON_CHANGE]: {
    color: 0xcaff9e,
    name: 'PLAYER ON CHANGE',
    order: 4,
  },
  default: {
    color: 0xfbff00,
    name: 'DEFAULT',
    order: -1,
  }
}

export class TimingGraph {

  private enabled: boolean = false;
  private events: TimingEvent[] = [];
  private eventsMaxLength: number = 300;

  private stage: PIXI.Container;
  private graphGfx: PIXI.Graphics;
  private graphGfxLegend: PIXI.Text[] = [];
  private graphScale: number = 1;

  // -----------------------------------------------------------------------------------------------
  constructor(enabled = false, stage: PIXI.Container) {
    this.enabled = enabled;
    this.stage = stage;
  }

  // -----------------------------------------------------------------------------------------------
  public toggleEnabled() {
    if (this.enabled) {
      this.graphGfx.destroy();
      this.graphGfx = undefined;
      for (let i = 0; i < this.graphGfxLegend.length; i++) {
        this.graphGfxLegend[i].destroy();
      }
      this.graphGfxLegend.length = 0;
    }
    this.enabled = !this.enabled;
  }

  // -----------------------------------------------------------------------------------------------
  public addTimingEvent(startTimestamp: number, type: TimingEventType) {
    if (!this.enabled) return;

    if (this.events.length + 1 > this.eventsMaxLength) {
      this.events.length = 0;
    }

    const now = performance.now();
    this.events.push({
      start: startTimestamp || now,
      end: now,
      type,
    });
  }

  // -----------------------------------------------------------------------------------------------
  public addTimingEventInstant(type: TimingEventType) {
    if (!this.enabled) return;

    if (this.events.length + 1 > this.eventsMaxLength) {
      this.events.length = 0;
    }

    const startTimestamp = performance.now();
    this.events.push({
      start: startTimestamp,
      end: startTimestamp + 1,
      type,
    });
  }

  // -----------------------------------------------------------------------------------------------
  public addTimingEventCallback(type: TimingEventType): () => void {
    if (!this.enabled) return () => {};

    const startTimestamp = performance.now();

    return () => {
      if (this.events.length + 1 > this.eventsMaxLength) {
        this.events.length = 0;
      }

      this.events.push({
        start: startTimestamp,
        end: performance.now(),
        type,
      });
    };
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
    if (this.events.length === 0) return;

    const LINE_HEIGHT = 20;
    const TIMING_GRAPH_X = 110;
    const TIMING_GRAPH_Y = constants.WORLD_SIZE + 20;
    const TIMING_GRAPH_WIDTH = this.stage.width;
    const TIMING_GRAPH_HEIGHT = 300;
    const TIMING_GRAPH_X_OFFSET = 100;
    const FPS_60_TIMING_PADDING = 2;
    const FPS_60_WIDTH = 16.66;

    if (!this.graphGfx) {
      this.graphGfx = new PIXI.Graphics();
      this.graphGfx.height = TIMING_GRAPH_HEIGHT;
      this.graphGfx.width = TIMING_GRAPH_WIDTH;
      this.graphGfx.position.set(TIMING_GRAPH_X, TIMING_GRAPH_Y);
      this.stage.addChild(this.graphGfx);

      const textStyle = new PIXI.TextStyle({ fill: "white", align: "right", fontSize: 8 });

      const keys = Object.keys(GraphDisplayConfig);
      for (let i = 0; i < keys.length; i++) {
        if (keys[i] === 'default') continue;

        const config = GraphDisplayConfig[keys[i]];
        const yOffset = (TIMING_GRAPH_Y + FPS_60_TIMING_PADDING) + ((config.order - 1) * LINE_HEIGHT);

        const text = new PIXI.Text(config.name, textStyle);
        text.anchor.set(1, 0.5);
        text.position.set(TIMING_GRAPH_X_OFFSET, yOffset + (LINE_HEIGHT / 2));
        this.graphGfxLegend.push(text);

        this.stage.addChild(text);
      }
    } else {
      this.graphGfx.clear();
    }

    // TODO: Reimplement the graph scaling.

    const beginTime = this.events[0].start;
    for (let i = 0; i < this.events.length; i++) {
      const event = this.events[i];
      const config = GraphDisplayConfig[event.type];

      const startPos = event.start - beginTime;
      const endPos = Math.max(1, event.end - beginTime);

      const yOffset = FPS_60_TIMING_PADDING + ((config.order - 1) * LINE_HEIGHT);
      this.graphGfx.beginFill(config.color);
      this.graphGfx.drawRect(startPos, yOffset, endPos - startPos, LINE_HEIGHT);
      this.graphGfx.endFill();
    }

    for (let i = 0; i < TIMING_GRAPH_WIDTH / FPS_60_WIDTH; i++) {
      if ((i + 1) % 2 === 0) continue;

      const xOffset = i * FPS_60_WIDTH;
      this.graphGfx.lineStyle(1, 0x7732a8, 1)
        .moveTo(xOffset, 0)
        .lineTo(xOffset + FPS_60_WIDTH, 0);
    }
  }
}