import { distance, lerp } from "../utils/vector";

enum ServerEntityType {
  PLAYER = "PLAYER",
  BOT = "BOT",
  ROCKET = "ROCKET",
}

type ServerEntity = {
  type: ServerEntityType;
  speed: number;
  positionBuffer: {
    id: number;
    timestamp: number;
    timeElapsed?: number;
    speed?: number;
    x?: number;
    y?: number;
  }[];
  gfx: PIXI.Graphics;
  flag?: boolean;
};

class EntityHelper {
  // -----------------------------------------------------------------------------------------------
  static hasEnoughPositionBuffers(entity: ServerEntity): boolean {
    return entity.positionBuffer.length > 1;
  }

  // -----------------------------------------------------------------------------------------------
  static removeFirstPositionBuffer(entity: ServerEntity): void {
    if (entity.positionBuffer.length > 0) {
      entity.positionBuffer.shift();
    }
  }

  // -----------------------------------------------------------------------------------------------
  static lerpBetweenPositionBuffers(entity: ServerEntity, timeElapsedMS: number, startIndex: number = 0, endIndex: number = 1): { x: number, y: number } | undefined {
    if (!this.hasEnoughPositionBuffers(entity)) {
      return undefined;
    }

    const packet1 = entity.positionBuffer[startIndex];
    const packet2 = entity.positionBuffer[endIndex];
    const position1 = { x: packet1.x || entity.gfx.x, y: packet1.y || entity.gfx.y };
    const position2 = { x: packet2.x || entity.gfx.x, y: packet2.y || entity.gfx.y };

    const distanceBetween = distance(position1.x, position1.y, position2.x, position2.y);
    const timeDiffMilli = packet2.timestamp - packet1.timestamp;

    if (packet1.timeElapsed === undefined) {
      packet1.timeElapsed = 0;
    }

    // if (entity.type === ServerEntityType.PLAYER) console.log(position2.x - position1.x);

    const rate = packet1.timeElapsed / timeDiffMilli;
    const lerpedPos = lerp(position1.x, position1.y, position2.x, position2.y, rate);

    packet1.timeElapsed += timeElapsedMS;

    // Roughly - Will the next iteration/tick exceed the time between these two packets?
    if (packet1.timeElapsed + timeElapsedMS >= timeDiffMilli) {
      const timeIntoNextIteration = (packet1.timeElapsed + timeElapsedMS) - timeDiffMilli;
      // if (entity.type === ServerEntityType.PLAYER) console.log("INTO NEXT PACKET: " + timeIntoNextIteration);
      packet2.timeElapsed = timeIntoNextIteration;

      this.removeFirstPositionBuffer(entity);
    }
    else if (isNaN(rate) || rate >= 1.0) {
      this.removeFirstPositionBuffer(entity);
    }

    return lerpedPos;
  }
}

export default EntityHelper;