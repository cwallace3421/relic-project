import type { ArenaRoom } from "../ArenaRoom";
import type { Client } from "colyseus";
import { ArenaPhase } from "./ArenaPhase";
import { Bot } from "../Bot";
import { generateId } from "colyseus";
import { getRandomBotName } from '../../../utils/botnames';
import { PHASE_NAME } from "../../../utils/enums";
import logger, { LogCodes } from '../../../utils/logger';
import constants from "../../../utils/constants";

export class ArenaWaiting extends ArenaPhase {

  private static PHASE_DURATION: number = 5 * 1000; // 5 Seconds

  constructor(room: ArenaRoom) {
    super(room, ArenaWaiting.PHASE_DURATION);
  }

  // @Override -------------------------------------------------------------------------------------
  onPhaseStart(): void {
    logger.info("Start Phase", LogCodes.ARENA_STATE_WAITING);
    this.startPhaseTimer();
  }

  // @Override -------------------------------------------------------------------------------------
  onPlayerJoin(client: Client, options: any): void {
    const playerCount = this.getState().players.size;
    if (playerCount === constants.ROOM_SIZE) {
      this.onPhaseEnd();
    }
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
    logger.info("End Phase", LogCodes.ARENA_STATE_WAITING);
    const playerCount = this.getState().players.size;
    const botsToSpawn = constants.ROOM_SIZE - playerCount;
    for (let i = 0; i < botsToSpawn; i++) {
      this.spawnBot();
    }

    this.clearPhaseTimer();
    this.room.changePhase(PHASE_NAME.ARENA_COUNTDOWN);
  }

  // @Override -------------------------------------------------------------------------------------
  onPhaseTimerEnd(): void {
    this.onPhaseEnd();
  }

  // -----------------------------------------------------------------------------------------------
  spawnBot(): void {
    const difficulty = Math.floor(Math.random() * 8);
    const botId = generateId();
    const botName = getRandomBotName();

    logger.info("Bot joined room.", LogCodes.SERVER_BOT, { botId, botName, difficulty });

    // TODO: Potentially extract the below into it's own class. Should a phase know how to create a Bot?
    const state = this.getState();
    state.bots.set(botId, new Bot().assign({
      id: botId,
      name: botName,
      x: Math.random() * state.width,
      y: Math.random() * state.height,
      targetX: Math.random() * state.width,
      targetY: Math.random() * state.height,
      difficulty: difficulty,
      speed: constants.PLAYER_SPEED,
    }));
  }

}