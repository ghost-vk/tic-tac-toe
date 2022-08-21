import EventEmitter from 'events';
import { StepResult } from '../types/game';

export enum GameActions {
  OnCreateGame = 'OnCreateGame',
  OnMakeStep = 'OnMakeStep',
  OnStepTimeout = 'OnStepTimeout',
  On3SerialWins = 'On3SerialWins',
  On10TotalWins = 'On10TotalWins',
  OnFailCreateGame = 'OnFailCreateGame',
}

export type GameEmitterPayload = {
  gameSessionId: string;
};

export type GameEmitterStepPayload = GameEmitterPayload & {
  result: StepResult;
};

export type GameEmitterPayloadWithWinner = GameEmitterPayload & {
  winnerId: string;
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

  on3SerialWins(payload: GameEmitterPayloadWithWinner): void {
    this.emit(GameActions.On3SerialWins, payload);
  }

  on10TotalWins(payload: GameEmitterPayloadWithWinner): void {
    this.emit(GameActions.On10TotalWins, payload);
  }

  onFailCreateGame(payload: GameEmitterPayload & { error: string }): void {
    this.emit(GameActions.OnFailCreateGame, payload);
  }
}

export const gameEmitter = new GameEmitter();
