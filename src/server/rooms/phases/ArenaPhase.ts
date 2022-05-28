import type { Client, Delayed } from "colyseus";
import type { ArenaRoom } from "../ArenaRoom";
import type { ArenaState } from "../ArenaState";

export abstract class ArenaPhase {

  private phaseDuration: number;

  private phaseTimer: Delayed;

  protected room: ArenaRoom;

  constructor(room: ArenaRoom, duration: number) {
    this.room = room;
    this.phaseDuration = duration;
  }

  abstract onPhaseStart(): void;

  abstract onPlayerJoin(client: Client, options: any): void;

  abstract onPlayerLeave(client: Client): void;

  abstract onTick(delta: number): void;

  abstract onPhaseEnd(): void;

  abstract onPhaseTimerEnd(): void;

  protected startPhaseTimer(): void {
    this.phaseTimer = this.room.clock.setTimeout(this.onPhaseTimerEnd.bind(this), this.phaseDuration);
  }

  protected clearPhaseTimer(): void {
    this.phaseTimer?.clear();
  }

  protected getState(): ArenaState {
    return this.room.state;
  }

  getPhaseDuration(): number {
    return this.phaseDuration;
  }

  getPhaseTimerElapsed(): number {
    return this.phaseTimer.elapsedTime;
  }

}