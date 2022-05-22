import { DataChange } from "@colyseus/schema";
import { lerp } from "../utils/vector";
import logger, { LogCodes } from "../utils/logger";
import constants from "../utils/constants";

export type EntityStateChange = {
  timestamp: number;
  id: string;
  x?: number;
  y?: number;
  rotation?: number;
  speed?: number;
  color?: number; // TODO: NOT SYNCED
}

export abstract class _NetworkedEntity {

    private changes = {
      count: 0,
      data: [] as EntityStateChange[],
      elapsed: {} as { [key: string]: number },
    };

    constructor() {}

    // -----------------------------------------------------------------------------------------------
    public abstract onEntityRemove(id: string): void;

    // -----------------------------------------------------------------------------------------------
    public abstract setX(x: number): void;

    // -----------------------------------------------------------------------------------------------
    public abstract setY(y: number): void;

    // -----------------------------------------------------------------------------------------------
    public abstract setRotation(degrees: number): void;

    // -----------------------------------------------------------------------------------------------
    public abstract getX(): number;

    // -----------------------------------------------------------------------------------------------
    public abstract getY(): number;

    // -----------------------------------------------------------------------------------------------
    public abstract getRotation(): number;

    // -----------------------------------------------------------------------------------------------
    public onTick(deltaTime: number): void {
      this.interpPositionBuffers(deltaTime);
    }

    // -----------------------------------------------------------------------------------------------
    public onStateChange(changes: DataChange<any>[]): void {
      let x: number;
      let y: number;
      let speed: number;
      let rotation: number;

      changes.forEach(c => {
        if (c.field === 'x' && c.value) {
          x = c.value;
        } else if (c.field === 'y' && c.value) {
          y = c.value;
        } else if (c.field === 'rotation' && c.value) {
          rotation = c.value;
        } else if (c.field === 'speed' && c.value) {
          speed = c.value;
        }
      });

      if (x || y || speed || rotation) {
        this.changes.count += 1;
        const dataToAdd: EntityStateChange = { timestamp: performance.now(), id: `${this.changes.count}`, x, y, speed, rotation };

        const len = this.changes.data.length;
        if (len > 0) {
          const lastAddedBuffer = this.changes.data[len - 1];
          if (dataToAdd.timestamp - lastAddedBuffer.timestamp > 80) {
            this.changes.data.length = 0;
          }
        }

        this.changes.data.push(dataToAdd);
      }
    }

    // -----------------------------------------------------------------------------------------------
    private interpPositionBuffers(deltaTime: number): void {
      if (this.changes.data.length < 2) return;
      // TODO: Need to be able to support when there is only one packet in the buffer.

      const packetOne = this.changes.data[0];
      const packetTwo = this.changes.data[1];

      this.initTimeElapsed(packetOne.id);

      const packetOneElapsed = this.addTimeElapsed(packetOne.id, deltaTime);

      const timeDiffMilli = packetTwo.timestamp - packetOne.timestamp;
      const rate = this.getTimeElapsed(packetOne.id) / timeDiffMilli;

      if (isNaN(rate) || rate > 1) {
        const timeIntoNextIteration = packetOneElapsed - timeDiffMilli;
        this.initTimeElapsed(packetTwo.id, timeIntoNextIteration);

        this.removeFirstChangeData();
        this.interpPositionBuffers(0);
      } else {
        const positionOne = { x: packetOne.x || this.getX(), y: packetOne.y || this.getY() };
        const positionTwo = { x: packetTwo.x || this.getX(), y: packetTwo.y || this.getY() };

        const lerpedPos = lerp(positionOne.x, positionOne.y, positionTwo.x, positionTwo.y, rate);

        this.setX(lerpedPos.x);
        this.setY(lerpedPos.y);

        if (packetOne.rotation) {
          // TODO: Slerp rotation between the two packets.
          this.setRotation(packetOne.rotation);
        }
      }
    }

    // -----------------------------------------------------------------------------------------------
    private initTimeElapsed(id: string, elapsed?: number): void {
      if (this.changes.elapsed[id] === undefined) this.changes.elapsed[id] = 0;
      if (elapsed !== undefined) this.changes.elapsed[id] = elapsed;
    }

    // -----------------------------------------------------------------------------------------------
    private getTimeElapsed(id: string): number {
      return this.changes.elapsed[id];
    }

    // -----------------------------------------------------------------------------------------------
    private addTimeElapsed(id: string, elapsed: number): number {
      this.changes.elapsed[id] += elapsed;
      return this.changes.elapsed[id];
    }

    // -----------------------------------------------------------------------------------------------
    private removeFirstChangeData(): EntityStateChange {
      return this.changes.data.shift();
    }
}