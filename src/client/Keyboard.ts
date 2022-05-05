import { TimingGraph, TimingEventType } from "./TimingGraph";
import type { Room } from "colyseus.js";


export enum UserActions {
  PLAYER_UP = "PLAYER_UP",
  PLAYER_DOWN = "PLAYER_DOWN",
  PLAYER_LEFT = "PLAYER_LEFT",
  PLAYER_RIGHT = "PLAYER_RIGHT",
  DASH = "DASH",
  INTERACT = "INTERACT",
  ZOOM_IN = "ZOOM_IN",
  ZOOM_OUT = "ZOOM_OUT",
  TOGGLE_MENU = "TOGGLE_MENU",
  TOGGLE_TIMING_GRAPH = "TOGGLE_TIMING_GRAPH",
}

const UserActionsNetworked: UserActions[] = [
  UserActions.PLAYER_UP,
  UserActions.PLAYER_DOWN,
  UserActions.PLAYER_LEFT,
  UserActions.PLAYER_RIGHT,
  UserActions.DASH,
  UserActions.INTERACT,
];

export class Keyboard {

  private keyMap: { [key in UserActions]: string } = {
    [UserActions.PLAYER_UP]: "w",
    [UserActions.PLAYER_DOWN]: "s",
    [UserActions.PLAYER_LEFT]: "a",
    [UserActions.PLAYER_RIGHT]: "d",
    [UserActions.DASH]: " ",
    [UserActions.INTERACT]: "e",
    [UserActions.ZOOM_IN]: "+",
    [UserActions.ZOOM_OUT]: "-",
    [UserActions.TOGGLE_MENU]: "Escape",
    [UserActions.TOGGLE_TIMING_GRAPH]: "/",
  };

  private state: { [key in UserActions | "DIRTY"]: boolean } = {
    [UserActions.PLAYER_UP]: false,
    [UserActions.PLAYER_DOWN]: false,
    [UserActions.PLAYER_LEFT]: false,
    [UserActions.PLAYER_RIGHT]: false,
    [UserActions.DASH]: false,
    [UserActions.INTERACT]: false,
    [UserActions.ZOOM_IN]: false,
    [UserActions.ZOOM_OUT]: false,
    [UserActions.TOGGLE_MENU]: false,
    [UserActions.TOGGLE_TIMING_GRAPH]: false,
    DIRTY: false,
  };

  // -----------------------------------------------------------------------------------------------
  constructor(onUserAction: (action: UserActions) => void) {
    const keyMappings = Object.entries(this.keyMap) as [UserActions, string][];

    const listener = (e: KeyboardEvent, target: boolean) => {
      const matchedKeyMapping = keyMappings.find(([_, v]) => v === e.key);
      if (!matchedKeyMapping) return;

      const [stateToUpdate, _] = matchedKeyMapping;
      if (this.state[stateToUpdate] === !target) {
        this.state[stateToUpdate] = target;
        this.state.DIRTY = true;

         // If the set state was 'key up'
        if (target === false) onUserAction(stateToUpdate);
      }
    };

    window.addEventListener("keydown", (e: KeyboardEvent) => listener(e, true));
    window.addEventListener("keyup", (e: KeyboardEvent) => listener(e, false));
  }

  // -----------------------------------------------------------------------------------------------
  public tick(room: Room, timingGraph: TimingGraph) {
    if (!this.state.DIRTY) return;

    const _tickComplete = timingGraph.addTimingEventCallback(TimingEventType.SEND_USER_ACTION);

    const message: { [key in UserActions]?: boolean } = {};
    const stateUserActions = Object.entries(this.state) as [UserActions, boolean][];

    stateUserActions.forEach(([userAction, value]) => {
      if (UserActionsNetworked.includes(userAction)) {
        message[userAction] = value;
      }
    });

    console.log('Send Keyboard State', message);
    room.send('user_action', message);

    this.state.DIRTY = false;

    _tickComplete();
  }
}