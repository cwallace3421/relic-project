import type { ArenaRoom } from "../ArenaRoom";
import type { Client } from "colyseus";
import { ArenaPhase } from "./ArenaPhase";
import { PHASE_NAME } from "../../../utils/enums";
import logger, { LogCodes } from '../../../utils/logger';

export class ArenaCountdown extends ArenaPhase {

  private static PHASE_DURATION: number = 3 * 1000; // 5 Seconds

  constructor(room: ArenaRoom) {
    super(room, ArenaCountdown.PHASE_DURATION);
  }

  // @Override -------------------------------------------------------------------------------------
  onPhaseStart(): void {
    logger.info("Start Phase", LogCodes.ARENA_STATE_COUNTDOWN);
    this.startPhaseTimer();
    this.toggleFreezeForAllActors(true);
    // TODO: Teleport players and bots to starting positions
  }

  // @Override -------------------------------------------------------------------------------------
  onPlayerJoin(client: Client, options: any): void {
    // TODO: Spawn As Spectator // const player = this.getState().players.get(client.sessionId);
  }

  // @Override -------------------------------------------------------------------------------------
  onPlayerLeave(client: Client): void {
    // No Phase Logic
    // TODO: Do we want to go back to Waiting phase if the room is below a certain capacity when a player leaves?
  }

  // @Override -------------------------------------------------------------------------------------
  onTick(delta: number): void {
    // No Phase Logic
  }

  // @Override -------------------------------------------------------------------------------------
  onPhaseEnd(): void {
    logger.info("End Phase", LogCodes.ARENA_STATE_COUNTDOWN);
    this.clearPhaseTimer();
    this.toggleFreezeForAllActors(false);
    this.room.changePhase(PHASE_NAME.ARENA_PLAYING);
  }

  // @Override -------------------------------------------------------------------------------------
  onPhaseTimerEnd(): void {
    this.onPhaseEnd();
  }

  // -----------------------------------------------------------------------------------------------
  toggleFreezeForAllActors(freeze: boolean): void {
    const state = this.getState();

    state.players.forEach((player) => {
      player.assign({ frozen: freeze });
    });

    state.bots.forEach((bot) => {
      bot.assign({ frozen: freeze });
    });
  }

}