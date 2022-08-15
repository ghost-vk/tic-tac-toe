import path from 'path';
import express, { Express, Request, Response } from 'express';
import WebSocket from 'ws';
import cors from 'cors';

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
  GameEmitterStepPayload,
  GameEmitterStepTimeoutPayload,
} from './gameEmitter';
import { GameService } from './gameService';
import { InviteError } from './exceptions/inviteError';

const app: Express = express();
app.use(express.json());

// For development purpose, use static folder on production
app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }));

const wss = new WebSocket.Server({ port: 8081 });

function onConnect(ws: WebSocketWithId) {
  const player = Player.create();
  ws.id = player.id;

  const createPlayerResponse: WSResponse = {
    type: WSResponseTypes.CreatePlayer,
    payload: { player: player.toDto() },
  };
  const newPlayerResponse = JSON.stringify(createPlayerResponse);
  ws.send(newPlayerResponse);

  ws.on('message', (rawData) => {
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

  ws.on('close', () => {
    Player.deletePlayer(player.id);
  });
}

wss.on('connection', onConnect);

inviteEmitter.on(InviteActions.OnCreateInvite, (payload: InviteEmitterPayload) => {
  InviteService.onCreateInvite(wss.clients, payload);
});

inviteEmitter.on(InviteActions.OnAcceptInvite, (payload: InviteEmitterPayload) => {
  InviteService.onAcceptInvite(wss.clients, payload);
});

gameEmitter.on(GameActions.OnCreateGame, (payload: GameEmitterPayload) => {
  GameService.onGameCreated(wss.clients, payload);
});

gameEmitter.on(GameActions.OnMakeStep, (payload: GameEmitterStepPayload) => {
  GameService.onGameStep(wss.clients, payload);
});

gameEmitter.on(GameActions.OnStepTimeout, (payload: GameEmitterStepTimeoutPayload) => {
  GameService.onStepTimeout(wss.clients, payload);
});

/**
 * Frontend client
 */
app.use('/', express.static(path.resolve(__dirname, './../../tic-tac-toe-front/dist')));

/**
 * Used to retrieve players to make invite
 */
app.get('/players', (req: Request, res: Response) => {
  res.json({ players: Player.list });
});

/**
 * Used to invite client (player) to [game session]{@link GameSession}
 */
app.post('/invite', (req: Request, res: Response) => {
  const inviteDto = req.body.invite;
  if (!inviteDto || !isCreateInviteBody(inviteDto)) {
    return res.status(403).json({ errors: ['Unavailable shape of create invite request'] });
  }

  const invite = Invite.createInvite(inviteDto.actorId, inviteDto.invitedPlayerId);

  if (invite instanceof InviteError) {
    return res.status(403).json({ errors: [invite.message] });
  }

  return res.json({ invite: invite.toDto() });
});

app.all('*', (req: Request, res: Response) => {
  res.status(404).send('404 - Not Found');
});

app.listen(8080, () => {
  console.log(`⚡️[server]: Server is running at https://localhost:8080`);
});
