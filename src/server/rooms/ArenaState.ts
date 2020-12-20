import { Client } from "colyseus";
import { Schema, type, MapSchema, filterChildren } from "@colyseus/schema";

import { Player } from "./Player";

export const WORLD_SIZE = 500;
export const DEFAULT_PLAYER_SPEED = 1;
export const DEFAULT_PLAYER_RADIUS = 10;

const clientSideFilterEntities = (client: Client, key: string, value: Player, root: ArenaState) => {
  const currentPlayer = root.players.get(client.sessionId);
  if (currentPlayer) {
      const a = value.x - currentPlayer.x;
      const b = value.y - currentPlayer.y;
      return (Math.sqrt(a * a + b * b)) <= 500;
  } else {
      return false;
  }
}

export class ArenaState extends Schema {
  @type("uint8")
  width = WORLD_SIZE;

  @type("uint8")
  height = WORLD_SIZE;

  @filterChildren(clientSideFilterEntities)
  @type({ map: Player })
  players = new MapSchema<Player>();
}
