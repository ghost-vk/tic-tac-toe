import { WebSocket } from 'ws';
import { CloseConnectionPayload } from '../events/connectionEmitter';
import { GameSession } from '../gameSession';
import { WebSocketWithId, WSResponse, WSResponseTypes } from '../types/ws';

export class ConnectionService {
  static onCloseConnection(clients: Set<WebSocket>, payload: CloseConnectionPayload) {
    const gameSession = GameSession.findByPlayerId(payload.playerId);
    if (!gameSession) {
      console.info(
        `Player [ID=${payload.playerId}] has been disconnected without opened Game Session`
      );
      return;
    }

    let firstPlayerClient: WebSocketWithId | null = null;
    let secondPlayerClient: WebSocketWithId | null = null;
    for (const client of clients) {
      const wsClient = client as WebSocketWithId;
      if (!wsClient.id) continue;
      if (firstPlayerClient && secondPlayerClient) continue;

      if (wsClient.id === gameSession._firstPlayer.id) {
        firstPlayerClient = wsClient;
      }

      if (wsClient.id === gameSession._secondPlayer.id) {
        secondPlayerClient = wsClient;
      }
    }

    if (!firstPlayerClient && !secondPlayerClient) {
      console.error(`First and second player of game session [ID=${gameSession.id}] not found`);
      return;
    }

    const response: WSResponse = {
      type: WSResponseTypes.OpponentLeftTheGameSession,
      payload: {
        opponentId: payload.playerId,
        message: 'Opponent has left the game session',
      },
    };

    if (firstPlayerClient) {
      firstPlayerClient.send(JSON.stringify(response));
    } else if (secondPlayerClient) {
      secondPlayerClient.send(JSON.stringify(response));
    }
  }
}
