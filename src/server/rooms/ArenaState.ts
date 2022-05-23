import { Client } from "colyseus";
import { Schema, type, MapSchema, filterChildren } from "@colyseus/schema";

import { Player } from "./Player";
import constants from "../../utils/constants";
import { Rocket } from "./Rocket";
import { Bot } from "./Bot";

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
  width: number = constants.WORLD_SIZE;

  @type("uint8")
  height: number = constants.WORLD_SIZE;

  // @filterChildren(clientSideFilterEntities) // TODO: Revisit - the current range is too small for the arena we have. Do we actually need this for this game?
  @type({ map: Player })
  players: MapSchema<Player> = new MapSchema<Player>();

  @type({ map: Rocket })
  rockets: MapSchema<Rocket> = new MapSchema<Rocket>();

  @type({ map: Bot })
  bots: MapSchema<Bot> = new MapSchema<Bot>();
}
