import WebSocket from 'ws';
import { isInSomeEnum } from '../utils/isInSomeEnum';
import { Board, StepCoords } from '../game';
import { PlayerDto } from '../player';

export type WSAcceptInvitePayload = {
  inviteId: string;
};

export type WSCreateGamePayload = {
  gameSessionId: string;
  boardSize: number;
};

export type WSMakeStepPayload = StepCoords & {
  gameSessionId: string;
  actor: { id: string };
};

export type WSRequestAcceptInvite = {
  action: WSActions.AcceptInvite;
  payload: WSAcceptInvitePayload;
};

export type WSRequestCreateGame = {
  action: WSActions.CreateGame;
  payload: WSCreateGamePayload;
};

export type WSRequestMakeStep = {
  action: WSActions.MakeStep;
  payload: WSMakeStepPayload;
};

export type WSRequest = WSRequestAcceptInvite | WSRequestCreateGame | WSRequestMakeStep;

export type WebSocketWithId = WebSocket & { id: string };

export enum WSActions {
  AcceptInvite = 'AcceptInvite',
  CreateGame = 'CreateGame',
  MakeStep = 'MakeStep',
}

export enum WSResponseTypes {
  CreatePlayer = 'CreatePlayer',
  InviteAccepted = 'InviteAccepted',
  InviteReceived = 'InviteReceived',
  GameCreated = 'GameCreated',
  GameStep = 'GameStep',
  StepTimeout = 'StepTimeout',
  FailCreateGame = 'FailCreateGame',
}

export type WSResponse = {
  type: WSResponseTypes;
  payload: unknown;
};

export type WSResponseGamePayload = {
  payload: {
    gameSession: {
      id: string;
      firstPlayer: {
        id: string;
        winCount: number;
      };
      secondPlayer: {
        id: string;
        winCount: number;
      };
    };
    game: {
      id: string;
      board: Board;
      isEnded?: boolean;
      winner?: PlayerDto | null;
      errors?: string[];
    } | null;
  };
};

export const isInWSActions = isInSomeEnum(WSActions);
