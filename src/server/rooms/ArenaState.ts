import { Client, generateId } from "colyseus";
import { Schema, type, MapSchema, filterChildren } from "@colyseus/schema";

import { Entity } from "./Entity";
import { Player } from "./Player";

export const WORLD_SIZE = 500;
export const DEFAULT_PLAYER_SPEED = 1;
export const DEFAULT_PLAYER_RADIUS = 10;

const clientSideFilterEntities = (client: Client, key: string, value: Entity, root: ArenaState) => {
  const currentPlayer = root.entities.get(client.sessionId);
  if (currentPlayer) {
      const a = value.x - currentPlayer.x;
      const b = value.y - currentPlayer.y;
      return (Math.sqrt(a * a + b * b)) <= 500;
  } else {
      return false;
  }
}

export class ArenaState extends Schema {

  width = WORLD_SIZE;
  height = WORLD_SIZE;

  @filterChildren(clientSideFilterEntities)
  @type({ map: Entity })
  entities = new MapSchema<Entity>();

  initializeState () {
    console.log("SERVER: ROOM: Initialize.");
  }

  createPlayer(sessionId: string) {
    this.entities.set(sessionId, new Player().assign({
      x: Math.random() * this.width,
      y: Math.random() * this.height
    }));
  }

  updateState(delta: number) {
    this.entities.forEach(this.updatePlayer.bind(this, delta));

    this.entities.forEach((entity: Entity, sessionId: string) => {
      if (entity.dead) {
        this.entities.delete(sessionId);
      }
    });
  }

  updatePlayer(delta: number, entity: Entity, sessionId: string) {
    const speed = DEFAULT_PLAYER_SPEED;// * delta;
    // console.log(speed);

    if (entity.isUpPressed === true) {
      entity.y -= speed;
    }
    else if (entity.isDownPressed === true) {
      entity.y += speed;
    }

    if (entity.isLeftPressed === true) {
      entity.x -= speed;
    }
    else if (entity.isRightPressed === true) {
      entity.x += speed;
    }

    const minBounds = DEFAULT_PLAYER_RADIUS;
    const maxBounds = WORLD_SIZE - DEFAULT_PLAYER_RADIUS;

    if (entity.y < minBounds) { entity.y = minBounds; }
    if (entity.y > maxBounds) { entity.y = maxBounds; }

    if (entity.x < minBounds) { entity.x = minBounds; }
    if (entity.x > maxBounds) { entity.x = maxBounds; }
  }
}
