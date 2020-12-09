import http from "http";
import { Room, Client } from "colyseus";
import { Entity } from "./Entity";
import { ArenaState } from "./ArenaState";

interface KeyboardMessage {
  isUpPressed: boolean;
  isDownPressed: boolean;
  isLeftPressed: boolean;
  isRightPressed: boolean;
}

export class ArenaRoom extends Room<ArenaState> {

  onCreate() {
    this.setState(new ArenaState());
    this.state.initializeState();

    this.onMessage("keyboard", this.onKeyboardMessage.bind(this));

    this.setSimulationInterval((delta: number) => this.state.updateState(delta));
  }

  onAuth(client: Client, options: any, request: http.IncomingMessage) {
    console.log(client);
    console.log(options);
    console.log(request);
    request.headers.cookie;
    return true;
  }

  onJoin(client: Client, options: any) {
    console.log("SERVER: Client joined.", { sessionId: client.sessionId });
    this.state.createPlayer(client.sessionId);
  }

  onLeave(client: Client) {
    console.log("SERVER: Client left.", { sessionId: client.sessionId });
    const entity = this.state.entities[client.sessionId];

    if (entity) {
      entity.dead = true;
    }
  }

  onKeyboardMessage(client: Client, message: KeyboardMessage) {
    const entity = this.state.entities[client.sessionId] as Entity;

    if (!entity || entity.dead === true) {
      console.log("SERVER: Client is trying to send an update when it's dead.", { sessionId: client.sessionId });
      return;
    }

    entity.isUpPressed = message.isUpPressed;
    entity.isDownPressed = message.isDownPressed;
    entity.isLeftPressed = message.isLeftPressed;
    entity.isRightPressed = message.isRightPressed;
  }

}
