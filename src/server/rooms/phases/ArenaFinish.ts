import type { ArenaRoom } from "../ArenaRoom";
import type { Client } from "colyseus";
import { ArenaPhase } from "./ArenaPhase";
import { PHASE_NAME } from "../../../utils/enums";
import logger, { LogCodes } from '../../../utils/logger';

export class ArenaFinish extends ArenaPhase {

  private static PHASE_DURATION: number = 5 * 1000; // 5 Seconds

  constructor(room: ArenaRoom) {
    super(room, ArenaFinish.PHASE_DURATION);
  }

  // @Override -------------------------------------------------------------------------------------
  onPhaseStart(): void {
    logger.info("Start Phase", LogCodes.ARENA_STATE_FINISH);
    this.startPhaseTimer();

    this.toggleFreezeForAllActors(true);
    this.destoryAllRockets();
  }

  // @Override -------------------------------------------------------------------------------------
  onPlayerJoin(client: Client, options: any): void {
    // No Phase Logic
  }

  // @Override -------------------------------------------------------------------------------------
  onPlayerLeave(client: Client): void {
    // No Phase Logic
  }

  // @Override -------------------------------------------------------------------------------------
  onTick(delta: number): void {
    // No Phase Logic
  }

  // @Override -------------------------------------------------------------------------------------
  onPhaseEnd(): void {
    logger.info("End Phase", LogCodes.ARENA_STATE_FINISH);
    this.clearPhaseTimer();
    this.destoryAllBots();
    this.toggleFreezeForAllActors(false);
    this.room.changePhase(PHASE_NAME.ARENA_WAITING);
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

  // -----------------------------------------------------------------------------------------------
  destoryAllRockets(): void {
    const state = this.getState();
    const keys = state.rockets.keys();
    logger.info("Destroying All Rockets", LogCodes.ARENA_STATE_FINISH, { ids: keys });
    [...keys].forEach((key) => state.rockets.delete(key));
  }

  // -----------------------------------------------------------------------------------------------
  destoryAllBots(): void {
    const state = this.getState();
    const keys = state.bots.keys();
    logger.info("Destroying All Bots", LogCodes.ARENA_STATE_FINISH, { ids: keys });
    [...keys].forEach((key) => state.bots.delete(key));
  }

}