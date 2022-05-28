import { Client } from "colyseus";
import { Schema, type, MapSchema, filterChildren } from "@colyseus/schema";
import { Bot } from "./Bot";
import { PHASE_NAME } from "../../utils/enums";
import { Player } from "./Player";
import { Rocket } from "./Rocket";
import constants from "../../utils/constants";

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

export class PhaseMeta extends Schema {
  @type("string")
  phaseType: PHASE_NAME = PHASE_NAME.ARENA_WAITING;

  @type("uint32")
  phaseDuration: number = 0;

  @type("uint16")
  phaseElapsedSeconds: number = 0;
}

export class ArenaState extends Schema {
  @type("uint8")
  width: number = constants.WORLD_SIZE;

  @type("uint8")
  height: number = constants.WORLD_SIZE;

  @type(PhaseMeta)
  meta: PhaseMeta = new PhaseMeta();

  // @filterChildren(clientSideFilterEntities) // TODO: Revisit - the current range is too small for the arena we have. Do we actually need this for this game?
  @type({ map: Player })
  players: MapSchema<Player> = new MapSchema<Player>();

  @type({ map: Rocket })
  rockets: MapSchema<Rocket> = new MapSchema<Rocket>();

  @type({ map: Bot })
  bots: MapSchema<Bot> = new MapSchema<Bot>();
}