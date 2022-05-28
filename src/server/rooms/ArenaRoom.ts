import * as http from "http";
import { Room, Client, Delayed } from "colyseus";
import { Player } from "./Player";
import { ArenaState } from "./ArenaState";
import logger, { LogCodes } from "../../utils/logger";
import constants from "../../utils/constants";
import { PHASE_NAME } from "../../utils/enums";
import { ArenaCommon, ArenaCountdown, ArenaFinish, ArenaPhase, ArenaPlaying, ArenaWaiting } from "./phases";

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

  private commonPhase: ArenaPhase;
  private currentPhase?: ArenaPhase;

  // @Override -------------------------------------------------------------------------------------
  onCreate() {
    this.clock.start();
    this.setState(new ArenaState());

    // Set network patch rate, sends out state updates of the world to the clients.
    // 20 packets per second - 50 ms
    this.setPatchRate(constants.NETWORK_BROADCAST_RATE);

    // Set simulation interval, runs the tick loop for the server world.
    // 60 fps - 16.6 ms
    this.setSimulationInterval((delta: number) => {
      const deltaTime: number = delta / 1000;

      const phaseTimeElapsedMilli = this.currentPhase?.getPhaseTimerElapsed() ?? 0;
      const phaseTimeElapsedSecs = Math.floor(phaseTimeElapsedMilli / 1000);
      if (this.state.meta.phaseElapsedSeconds !== phaseTimeElapsedSecs) this.state.meta.assign({ phaseElapsedSeconds: phaseTimeElapsedSecs });

      this.commonPhase.onTick(deltaTime);
      this.currentPhase?.onTick(deltaTime);
    }, constants.SIMULATION_TICK_RATE);

    this.onMessage("user_action", (client: Client, message: UserActionMessage) => {
      this.onUserActionMessage(client, message);
    });

    this.onMessage("ping", (client: Client, message: any) => {
      client.send('pong', message);
    });

    this.changePhase(PHASE_NAME.ARENA_WAITING);
    this.commonPhase = new ArenaCommon(this);
  }

  // @Override -------------------------------------------------------------------------------------
  onAuth(client: Client, options: any, request: http.IncomingMessage): boolean {
    return !!options.name;
  }

  // @Override -------------------------------------------------------------------------------------
  onJoin(client: Client, options: any) {
    this.commonPhase.onPlayerJoin(client, options);
    this.currentPhase?.onPlayerJoin(client, options);
  }

  // @Override -------------------------------------------------------------------------------------
  onLeave(client: Client) {
    this.commonPhase.onPlayerLeave(client);
    this.currentPhase?.onPlayerLeave(client);
  }

  // -----------------------------------------------------------------------------------------------
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

  // -----------------------------------------------------------------------------------------------
  changePhase(newPhase: PHASE_NAME): void {
    logger.info(`Changing Phase [${newPhase}]`, LogCodes.ARENA_ROOM);

    switch (newPhase) {
      case PHASE_NAME.ARENA_WAITING:
        this.currentPhase = new ArenaWaiting(this);
        break;
      case PHASE_NAME.ARENA_COUNTDOWN:
        this.currentPhase = new ArenaCountdown(this);
        break;
      case PHASE_NAME.ARENA_PLAYING:
        this.currentPhase = new ArenaPlaying(this);
        break;
      case PHASE_NAME.ARENA_FINISH:
        this.currentPhase = new ArenaFinish(this);
        break;
    }

    this.state.meta.assign({
      phaseType: newPhase,
      phaseDuration: this.currentPhase.getPhaseDuration(),
      phaseElapsedSeconds: 0
    });

    this.currentPhase.onPhaseStart();
  }

}
