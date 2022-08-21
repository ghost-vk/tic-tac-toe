import path from 'path';
import express, { Express, Request, Response } from 'express';
import WebSocket from 'ws';
import cors from 'cors';
import dotenv from 'dotenv';

import { Invite } from './invite';
import { inviteEmitter } from './inviteEmitter';
import { Player } from './player';
import { isCreateInviteBody } from './typeguards/isCreateInviteBody';
import { InviteActions, InviteEmitterPayload } from './inviteEmitter';
import { WebSocketWithId, WSActions, WSRequest, WSResponse, WSResponseTypes } from './types/ws';
import { InviteService } from './inviteService';
import { isWebSocketRequest } from './typeguards/isWebSocketRequest';
import {
  GameActions,
  gameEmitter,
  GameEmitterPayload,
  GameEmitterPayloadWithWinner,
  GameEmitterStepPayload,
  GameEmitterStepTimeoutPayload,
} from './gameEmitter';
import { GameService } from './gameService';
import { InviteError } from './exceptions/inviteError';
import { CloseConnectionPayload, connectionEmitter, ConnectionEvents } from './connectionEmitter';
import { ConnectionService } from './connectionService';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const WEBSOCKET_PORT = process.env.WEBSOCKET_PORT ? Number(process.env.WEBSOCKET_PORT) : 8081;
const APP_PORT = process.env.APP_PORT ? Number(process.env.APP_PORT) : 8080;

const app: Express = express();
app.use(express.json());

// For development purpose, use static folder on production
const origin = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [];
if (origin.length > 0) {
  app.use(cors({ origin }));
}

const wss = new WebSocket.Server({ port: WEBSOCKET_PORT });

function onConnect(ws: WebSocketWithId): void {
  const player = Player.create();
  ws.id = player.id;

  const createPlayerResponse: WSResponse = {
    type: WSResponseTypes.CreatePlayer,
    payload: { player: player.toDto() },
  };
  const newPlayerResponse = JSON.stringify(createPlayerResponse);
  ws.send(newPlayerResponse);

  ws.on('message', (rawData): void => {
    const webSocketRequest = JSON.parse(rawData.toString()) as WSRequest;

    if (!isWebSocketRequest(webSocketRequest)) {
      const badRequest = { errors: ['Not valid web socket request'] };
      ws.send(JSON.stringify(badRequest));
      return;
    }

    switch (webSocketRequest.action) {
      case WSActions.AcceptInvite: {
        InviteService.acceptInvite(webSocketRequest.payload.inviteId);
        break;
      }
      case WSActions.CreateGame: {
        GameService.createGame(webSocketRequest.payload);
        break;
      }
      case WSActions.MakeStep: {
        GameService.makeStep(webSocketRequest.payload);
        break;
      }
    }
  });

  ws.on('close', (): void => {
    connectionEmitter.onCloseConnection({ playerId: player.id });
    Player.deletePlayer(player.id);
  });
}

wss.on('connection', onConnect);

/**
 * Fires when one player creates invite to another player
 */
inviteEmitter.on(InviteActions.OnCreateInvite, (payload: InviteEmitterPayload): void => {
  InviteService.onCreateInvite(wss.clients, payload);
});

/**
 * Fires when someone player accepted to invite from another player
 */
inviteEmitter.on(InviteActions.OnAcceptInvite, (payload: InviteEmitterPayload): void => {
  InviteService.onAcceptInvite(wss.clients, payload);
});

/**
 * Fires when [game]{@link Game} has been created in [game session]{@link GameSession}
 */
gameEmitter.on(GameActions.OnCreateGame, (payload: GameEmitterPayload): void => {
  GameService.onGameCreated(wss.clients, payload);
});

/**
 * Fires when player make [step]{@link Step}
 */
gameEmitter.on(GameActions.OnMakeStep, (payload: GameEmitterStepPayload): void => {
  GameService.onGameStep(wss.clients, payload);
});

/**
 * Fires when error occurs on create game
 */
gameEmitter.on(
  GameActions.OnFailCreateGame,
  (payload: GameEmitterPayload & { error: string }): void => {
    GameService.onFailCreateGame(wss.clients, payload);
  }
);

/**
 * Fires when time is out after step (15s after step)
 */
gameEmitter.on(GameActions.OnStepTimeout, (payload: GameEmitterStepTimeoutPayload): void => {
  GameService.onStepTimeout(wss.clients, payload);
});

/**
 * Fires when player wins 3 times sequentially
 */
gameEmitter.on(GameActions.On3SerialWins, (payload: GameEmitterPayloadWithWinner): void => {
  GameService.on3SerialWins(wss.clients, payload);
});

/**
 * Fires when player wins 10 times total
 */
gameEmitter.on(GameActions.On3SerialWins, (payload: GameEmitterPayloadWithWinner): void => {
  GameService.on10TotalWins(wss.clients, payload);
});

/**
 * Fires when player close websocket connection
 */
connectionEmitter.on(ConnectionEvents.Close, (payload: CloseConnectionPayload): void => {
  ConnectionService.onCloseConnection(wss.clients, payload);
});

/**
 * Frontend client
 */
app.use('/', express.static(path.resolve(__dirname, '..', '..', 'tic-tac-toe-front', 'dist')));

/**
 * Used to retrieve [players]{@link Player}
 */
app.get('/players', (req: Request, res: Response) => {
  res.json({ players: Player.list });
});

/**
 * Used to invite client (player) to [game session]{@link GameSession}
 */
app.post('/invite', (req: Request, res: Response): void => {
  const inviteDto = req.body.invite;
  if (!inviteDto || !isCreateInviteBody(inviteDto)) {
    res.status(403).json({ errors: ['Unavailable shape of create invite request'] });
    return;
  }

  const invite = Invite.createInvite(inviteDto.actorId, inviteDto.invitedPlayerId);

  if (invite instanceof InviteError) {
    res.status(403).json({ errors: [invite.message] });
    return;
  }

  res.json({ invite: invite.toDto() });
});

app.all('*', (req: Request, res: Response): void => {
  res.status(404).send('404 - Not Found');
});

app.listen(APP_PORT, (): void => {
  console.log(`⚡️[server]: Server is running at https://localhost:${APP_PORT}`);
});
