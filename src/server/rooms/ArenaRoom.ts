import * as http from "http";
import { Room, Client, Delayed } from "colyseus";
import { Player } from "./Player";
import { ArenaState } from "./ArenaState";
import { onInit, onPlayerAuth, onPlayerJoin, onPlayerLeave, onRocketSpawn, onTick } from "./ArenaLogic";
import logger, { LogCodes } from "../../utils/logger";
import constants from "../../utils/constants";

// interface KeyboardMessage {
//   isUpPressed: boolean;
//   isDownPressed: boolean;
//   isLeftPressed: boolean;
//   isRightPressed: boolean;
// }

enum UserActions {
  PLAYER_UP = "PLAYER_UP",
  PLAYER_DOWN = "PLAYER_DOWN",
  PLAYER_LEFT = "PLAYER_LEFT",
  PLAYER_RIGHT = "PLAYER_RIGHT",
  DASH = "DASH",
  INTERACT = "INTERACT",
}

type UserActionMessage = { [key in UserActions]: boolean };

export class ArenaRoom extends Room<ArenaState> {

  public roundTimer!: Delayed;

  onCreate() {
    this.setState(new ArenaState());
    this.clock.start();

    onInit(this.state);

    this.onMessage("user_action", (client: Client, message: UserActionMessage) => {
      this.onUserActionMessage(client, message);
    });

    this.onMessage("ping", (client: Client, message: any) => {
      message.messageRecievedByServer = Date.now();
      message.messageSentToClient = Date.now();
      client.send('pong', message);
    });

    this.roundTimer = this.clock.setTimeout(() => {
      onRocketSpawn(this.state);
    }, 2000);

    // Set network patch rate, sends out state updates of the world to the clients.
    // 20 packets per second - 50 ms
    this.setPatchRate(constants.NETWORK_BROADCAST_RATE);

    // Set simulation interval, runs the tick loop for the server world.
    // 60 fps - 16.6 ms
    this.setSimulationInterval((delta: number) => {
      this.onRoomUpdate(delta);
    }, constants.SIMULATION_TICK_RATE);
  }

  onAuth(client: Client, options: any, request: http.IncomingMessage) {
    return onPlayerAuth(client, options, request);
  }

  onJoin(client: Client, options: any) {
    onPlayerJoin(this.state, client, options);
  }

  onLeave(client: Client) {
    onPlayerLeave(this.state, client);
  }

  onRoomUpdate(delta: number) {
    onTick(this.state, delta);
  }

  onUserActionMessage(client: Client, message: UserActionMessage) {
    const player = this.state.players[client.sessionId] as Player;
    if (!player || player.dead === true) {
      logger.error("Player is trying to send an update when it's dead.", LogCodes.SERVER_PLAYER, { sessionId: client.sessionId });
    } else {
      player.assign({
        isUpPressed: message[UserActions.PLAYER_UP],
        isDownPressed: message[UserActions.PLAYER_DOWN],
        isLeftPressed: message[UserActions.PLAYER_LEFT],
        isRightPressed: message[UserActions.PLAYER_RIGHT],
        isInteractPressed: message[UserActions.INTERACT],
      });
    }
  }

}
