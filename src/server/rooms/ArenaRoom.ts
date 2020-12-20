import http from "http";
import { Room, Client } from "colyseus";
import { Player } from "./Player";
import { ArenaState } from "./ArenaState";
import { onInit, onPlayerAuth, onPlayerJoin, onPlayerLeave, onTick } from "./ArenaLogic";
import logger, { LogCodes } from "../../utils/logger";

interface KeyboardMessage {
  isUpPressed: boolean;
  isDownPressed: boolean;
  isLeftPressed: boolean;
  isRightPressed: boolean;
}

export class ArenaRoom extends Room<ArenaState> {

  onCreate() {
    this.setState(new ArenaState());

    onInit(this.state);

    this.onMessage("keyboard", (client: Client, message: KeyboardMessage) => {
      this.onKeyboardMessage(client, message);
    });

    // Default - 60fps - 16.6 millis
    this.setSimulationInterval(this.onRoomUpdate.bind(this), 16.66);
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
      // player.isUpPressed = message.isUpPressed;
      // player.isDownPressed = message.isDownPressed;
      // player.isLeftPressed = message.isLeftPressed;
      // player.isRightPressed = message.isRightPressed;
    }
  }

}
