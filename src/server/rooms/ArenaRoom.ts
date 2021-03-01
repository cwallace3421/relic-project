import http from "http";
import { Room, Client, Delayed } from "colyseus";
import { Player } from "./Player";
import { ArenaState } from "./ArenaState";
import { onInit, onPlayerAuth, onPlayerJoin, onPlayerLeave, onRocketSpawn, onTick } from "./ArenaLogic";
import logger, { LogCodes } from "../../utils/logger";
import constants from "../../utils/constants";

interface KeyboardMessage {
  isUpPressed: boolean;
  isDownPressed: boolean;
  isLeftPressed: boolean;
  isRightPressed: boolean;
}

export class ArenaRoom extends Room<ArenaState> {

  public roundTimer!: Delayed;

  onCreate() {
    this.setState(new ArenaState());
    this.clock.start();

    onInit(this.state);

    this.onMessage("keyboard", (client: Client, message: KeyboardMessage) => {
      this.onKeyboardMessage(client, message);
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
    // 20 fps - 50 ms
    // this.setPatchRate(constants.NETWORK_BROADCAST_RATE);

    // Set simulation interval, runs the tick loop for the server world.
    // 60 fps - 16.6 ms
    this.setSimulationInterval(this.onRoomUpdate.bind(this), constants.SIMULATION_TICK_RATE);
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

  onKeyboardMessage(client: Client, message: KeyboardMessage) {
    const player = this.state.players[client.sessionId] as Player;
    if (!player || player.dead === true) {
      logger.error("Player is trying to send an update when it's dead.", LogCodes.SERVER_PLAYER, { sessionId: client.sessionId });
    } else {
      player.assign({
        isUpPressed: message.isUpPressed,
        isDownPressed: message.isDownPressed,
        isLeftPressed: message.isLeftPressed,
        isRightPressed: message.isRightPressed,
      });
    }
  }

}
