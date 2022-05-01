import { distance, lerp } from "../utils/vector";

enum ServerEntityType {
  PLAYER = "PLAYER",
  BOT = "BOT",
  ROCKET = "ROCKET",
}

interface ServerEntity {
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
  static lerpBetweenPositionBuffers(entity: ServerEntity, timeElapsedMS: number, startIndex: number = 0, endIndex: number = 1, iterations: number = 0): { x: number, y: number } | undefined {
    if (iterations > 0) {
      // if (entity.type === ServerEntityType.PLAYER) console.warn('The entity is iterating really deeply', entity.type, iterations);
    }

    if (!this.hasEnoughPositionBuffers(entity)) {
      // if (entity.type === ServerEntityType.PLAYER && iterations > 0) console.log('Not enough position buffers to do another iteration')
      return undefined;
    }

    // TODO: We probably want to lerp towards the first position buffer, rather than lerping between the first and second position buffer
    // So you would lerp the player entity towards the first player buffer and then clear it when it reaches it. (Do the same over flow logic into the second buffer)
    // Though how do you tell how long the lerp should take? Don't know.
    // All of the above would mean we don't need to check that there is two posistion buffers to do a lerp. We can continue lerping until there is no position buffers left to process.
    // This is the way we should do this? Yeah pretty sure.
    const packet1 = entity.positionBuffer[startIndex];
    const packet2 = entity.positionBuffer[endIndex];
    const position1 = { x: packet1.x || entity.gfx.x, y: packet1.y || entity.gfx.y };
    const position2 = { x: packet2.x || entity.gfx.x, y: packet2.y || entity.gfx.y };

    const distanceBetween = distance(position1.x, position1.y, position2.x, position2.y);
    const timeDiffMilli = packet2.timestamp - packet1.timestamp;

    if (packet1.timeElapsed === undefined) {
      packet1.timeElapsed = 0;
    }

    const rate = packet1.timeElapsed / timeDiffMilli;
    const lerpedPos = lerp(position1.x, position1.y, position2.x, position2.y, rate);

    packet1.timeElapsed += timeElapsedMS;

    // Roughly - Will the next iteration/tick exceed the time between these two packets?
    if (packet1.timeElapsed + timeElapsedMS >= timeDiffMilli) {
      const timeIntoNextIteration = (packet1.timeElapsed + timeElapsedMS) - timeDiffMilli;
      packet2.timeElapsed = timeIntoNextIteration;

      this.removeFirstPositionBuffer(entity);
      this.lerpBetweenPositionBuffers(entity, startIndex, endIndex, 1, iterations + 1);

      // if (entity.type === ServerEntityType.PLAYER) console.log({
      //   totalElapsedTimeMS: packet1.timeElapsed + timeElapsedMS,
      //   timeDiffMilli,
      //   overSpillIntoNextPacketMS: packet2.timeElapsed,
      //   packets: [packet1, packet2],
      // });
    }
    else if (rate >= 1.0) {
      this.removeFirstPositionBuffer(entity);
    }

    // if (rate >= 1.0) {
    //   this.removeFirstPositionBuffer(entity);
    // }

    return lerpedPos;
  }
}

export default EntityHelper;