import EventEmitter from 'events';
import { StepResult } from './game';

export enum GameActions {
  OnCreateGame = 'OnCreateGame',
  OnMakeStep = 'OnMakeStep',
  OnStepTimeout = 'OnStepTimeout',
}

export type GameEmitterPayload = {
  gameSessionId: string;
};

export type GameEmitterStepPayload = GameEmitterPayload & {
  result: StepResult;
};

export type GameEmitterStepTimeoutPayload = {
  gameId: string;
  winnerId: string;
};

class GameEmitter extends EventEmitter {
  afterCreateGame(payload: GameEmitterPayload): void {
    this.emit(GameActions.OnCreateGame, payload);
  }

  afterMakeStep(payload: GameEmitterStepPayload): void {
    this.emit(GameActions.OnMakeStep, payload);
  }

  onStepTimeout(payload: GameEmitterStepTimeoutPayload): void {
    this.emit(GameActions.OnStepTimeout, payload);
  }
}

export const gameEmitter = new GameEmitter();
