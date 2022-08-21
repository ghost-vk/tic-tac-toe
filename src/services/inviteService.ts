import { WebSocket } from 'ws';

import { inviteEmitter, InviteEmitterPayload } from '../events/inviteEmitter';
import { WebSocketWithId, WSResponse, WSResponseTypes } from '../types/ws';
import { Invite } from '../invite';
import { GameSession } from '../gameSession';
import { InviteError } from '../exceptions/inviteError';

export class InviteService {
  static onCreateInvite(clients: Set<WebSocket>, payload: InviteEmitterPayload): void {
    const invite = Invite.findById(payload.inviteId);
    if (!invite) return;

    let invitedClient: WebSocket | null = null;
    for (const client of clients) {
      const wsClient = client as WebSocketWithId;
      if (!wsClient.id) continue;
      if (wsClient.id === invite.invitedPlayerId) {
        invitedClient = wsClient;
      }
    }

    if (!invitedClient) {
      console.error(`Invited client [ID=${invite.invitedPlayerId}] not found`);
      return;
    }

    const responsePayload: WSResponse = {
      type: WSResponseTypes.InviteReceived,
      payload: { inviteId: invite.id },
    };
    invitedClient.send(JSON.stringify(responsePayload));
  }

  static acceptInvite(inviteId: string): void {
    const res = Invite.acceptInvite(inviteId);
    if (res instanceof InviteError) {
      const errorPayload: InviteEmitterPayload = { inviteId };
      inviteEmitter.afterFailAcceptInvite(errorPayload);
    }
    const successPayload: InviteEmitterPayload = { inviteId };
    inviteEmitter.afterAcceptInvite(successPayload);
  }

  static onAcceptInvite(clients: Set<WebSocket>, payload: InviteEmitterPayload): void {
    const invite = Invite.findById(payload.inviteId);
    if (!invite) {
      console.error(`Invite [ID=${payload.inviteId}] not found`);
      return;
    }

    let actor: WebSocketWithId | null = null;
    let invitedPlayer: WebSocketWithId | null = null;
    for (const client of clients) {
      const wsClient = client as WebSocketWithId;
      if (!wsClient.id) continue;
      if (actor && invitedPlayer) continue;

      if (wsClient.id === invite.invitedPlayerId) {
        invitedPlayer = wsClient;
      }

      if (wsClient.id === invite.actorId) {
        actor = wsClient;
      }
    }

    if (!actor || !invitedPlayer) {
      console.error(`Actor or invited player for invite [ID=${payload.inviteId}] not found`);
      return;
    }

    const gameSession = GameSession.findByInviteId(invite.id);
    if (!gameSession) {
      console.error(`Game session for invite [ID=${invite.id}] not found`);
      return;
    }

    const responsePayload: WSResponse = {
      type: WSResponseTypes.InviteAccepted,
      payload: { gameSessionId: gameSession.id },
    };

    actor.send(JSON.stringify(responsePayload));
    invitedPlayer.send(JSON.stringify(responsePayload));
  }
}
