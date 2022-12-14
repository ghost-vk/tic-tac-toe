import {
  WebSocketWithId,
  WSCreateGamePayload,
  WSMakeStepPayload,
  WSResponse,
  WSResponseGamePayload,
  WSResponseTypes,
} from '../types/ws';
import { WebSocket } from 'ws';
import {
  gameEmitter,
  GameEmitterPayload,
  GameEmitterPayloadWithWinner,
  GameEmitterStepPayload,
  GameEmitterStepTimeoutPayload,
} from '../events/gameEmitter';
import { GameSession } from '../gameSession';
import { GameList } from '../gameList';
import { GameSessionError } from '../exceptions/gameSessionError';

export class GameService {
  static createGame(payload: WSCreateGamePayload): void {
    const gameSession = GameSession.findById(payload.gameSessionId);
    if (!gameSession) {
      console.error(`Game session [ID=${payload.gameSessionId}] not found`);
      return;
    }

    if (payload.boardSize < 3) {
      console.error(`Board size should be at least 3x3`);
      return;
    }

    const game = gameSession.makeGame(payload.boardSize);
    if (game instanceof GameSessionError) {
      gameEmitter.onFailCreateGame({ error: game.message, gameSessionId: gameSession.id });
    }

    const emitterPayload: GameEmitterPayload = {
      gameSessionId: gameSession.id,
    };

    gameEmitter.afterCreateGame(emitterPayload);
  }

  static onGameCreated(clients: Set<WebSocket>, payload: GameEmitterPayload): void {
    const gameSession = GameSession.findById(payload.gameSessionId);
    if (!gameSession) {
      console.error(`Game session [ID=${payload.gameSessionId}] not found`);
      return;
    }
    const game = gameSession.currentGame;
    if (!game) {
      console.error(`Game has not been created at Game session [ID=${payload.gameSessionId}]`);
      return;
    }
    let firstPlayerClient: WebSocketWithId | null = null;
    let secondPlayerClient: WebSocketWithId | null = null;
    for (const client of clients) {
      const wsClient = client as WebSocketWithId;
      if (!wsClient.id) continue;
      if (firstPlayerClient && secondPlayerClient) continue;

      if (wsClient.id === game.firstPlayer.id) {
        firstPlayerClient = wsClient;
      }

      if (wsClient.id === game.secondPlayer.id) {
        secondPlayerClient = wsClient;
      }
    }

    if (!firstPlayerClient || !secondPlayerClient) {
      console.error(`First or second player of game [ID=${game.id}] not found`);
      return;
    }

    const responsePayload: WSResponse & WSResponseGamePayload = {
      type: WSResponseTypes.GameCreated,
      payload: {
        gameSession: {
          id: gameSession.id,
          firstPlayer: {
            id: firstPlayerClient.id,
            winCount: 0,
          },
          secondPlayer: {
            id: secondPlayerClient.id,
            winCount: 0,
          },
        },
        game: {
          id: game.id,
          board: game.board,
        },
      },
    };

    firstPlayerClient.send(JSON.stringify(responsePayload));
    secondPlayerClient.send(JSON.stringify(responsePayload));
  }

  static onGameStep(clients: Set<WebSocket>, payload: GameEmitterStepPayload): void {
    const gameSession = GameSession.findById(payload.gameSessionId);
    if (!gameSession) {
      console.error(`Game session [ID=${payload.gameSessionId}] not found`);
      return;
    }
    let game = gameSession.currentGame;
    if (!game) {
      console.error(`Game has not been created at Game session [ID=${payload.gameSessionId}]`);
      return;
    }
    let firstPlayerClient: WebSocketWithId | null = null;
    let secondPlayerClient: WebSocketWithId | null = null;
    for (const client of clients) {
      const wsClient = client as WebSocketWithId;
      if (!wsClient.id) continue;
      if (firstPlayerClient && secondPlayerClient) continue;

      if (wsClient.id === game.firstPlayer.id) {
        firstPlayerClient = wsClient;
      }

      if (wsClient.id === game.secondPlayer.id) {
        secondPlayerClient = wsClient;
      }
    }

    if (!firstPlayerClient || !secondPlayerClient) {
      console.error(`First or second player of game [ID=${game.id}] not found`);
      return;
    }

    const isEnded = payload.result.isEnded;
    if (isEnded && payload.result.winner?.id) {
      gameSession.addWinCount(payload.result.winner.id);
    }

    if (gameSession.finalWinnerId) return;

    if (isEnded) {
      const res = gameSession.makeGame(game.boardSize);
      if (res instanceof GameSessionError) {
        gameEmitter.onFailCreateGame({
          gameSessionId: gameSession.id,
          error: res.message,
        });
      } else {
        game = res;
      }
    }

    const gameState: WSResponseGamePayload['payload']['game'] = {
      id: game.id,
      board: game.board,
      winner: payload.result.winner,
      errors: payload.result.errors,
      isEnded: payload.result.isEnded,
    };

    const responsePayload: WSResponse & WSResponseGamePayload = {
      type: WSResponseTypes.GameStep,
      payload: {
        gameSession: {
          id: gameSession.id,
          firstPlayer: {
            id: firstPlayerClient.id,
            winCount: gameSession.firstPlayerWinCount,
          },
          secondPlayer: {
            id: secondPlayerClient.id,
            winCount: gameSession.secondPlayerWinCount,
          },
        },
        game: gameState,
      },
    };

    firstPlayerClient.send(JSON.stringify(responsePayload));
    secondPlayerClient.send(JSON.stringify(responsePayload));
  }

  static makeStep(payload: WSMakeStepPayload): void {
    const gameSession = GameSession.findById(payload.gameSessionId);
    if (!gameSession) {
      console.error(`Game session [ID=${payload.gameSessionId}] not found`);
      return;
    }

    const game = gameSession.currentGame;
    if (!game) {
      console.error(`Current game in Game session [ID=${gameSession.id}] is null`);
      return;
    }

    const stepResult = game.next({ ...payload });

    const emitterPayload: GameEmitterStepPayload = {
      gameSessionId: gameSession.id,
      result: stepResult,
    };

    gameEmitter.afterMakeStep(emitterPayload);
  }

  static onStepTimeout(clients: Set<WebSocket>, payload: GameEmitterStepTimeoutPayload) {
    let game = GameList.findById(payload.gameId);

    // Possible game is deleted
    if (!game) return;

    // Already started new game
    if (game.isEnded) return;

    const gameSession = GameSession.findByGameId(game.id);
    if (!gameSession) {
      console.error(`Game session for Game [ID=${game.id}] not found`);
      return;
    }

    let firstPlayerClient: WebSocketWithId | null = null;
    let secondPlayerClient: WebSocketWithId | null = null;
    for (const client of clients) {
      const wsClient = client as WebSocketWithId;
      if (!wsClient.id) continue;
      if (firstPlayerClient && secondPlayerClient) continue;

      if (wsClient.id === game.firstPlayer.id) {
        firstPlayerClient = wsClient;
      }

      if (wsClient.id === game.secondPlayer.id) {
        secondPlayerClient = wsClient;
      }
    }

    if (!firstPlayerClient || !secondPlayerClient) {
      console.error(`First or second player of game [ID=${game.id}] not found`);
      return;
    }

    game.isEnded = true;
    gameSession.addWinCount(payload.winnerId);
    if (!gameSession.finalWinnerId) {
      const newGame = gameSession.makeGame(game.boardSize);
      if (newGame instanceof GameSessionError) {
        console.error('Fail when create new game after step timeout');
        return;
      } else {
        game = newGame;
      }
    }

    const responsePayload: WSResponse & WSResponseGamePayload = {
      type: WSResponseTypes.StepTimeout,
      payload: {
        gameSession: {
          id: gameSession.id,
          firstPlayer: {
            id: firstPlayerClient.id,
            winCount: gameSession.firstPlayerWinCount,
          },
          secondPlayer: {
            id: secondPlayerClient.id,
            winCount: gameSession.secondPlayerWinCount,
          },
        },
        game: {
          id: game.id,
          board: game.board,
          winner: null,
          errors: [],
          isEnded: false,
        },
      },
    };

    firstPlayerClient.send(JSON.stringify(responsePayload));
    secondPlayerClient.send(JSON.stringify(responsePayload));
  }

  static onFailCreateGame(
    clients: Set<WebSocket>,
    payload: GameEmitterPayload & { error: string }
  ) {
    const gameSession = GameSession.findById(payload.gameSessionId);
    if (!gameSession) {
      console.error(`Game session [ID=${payload.gameSessionId}] not found`);
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

    if (!firstPlayerClient || !secondPlayerClient) {
      console.error(
        `First or second player of game session [ID=${payload.gameSessionId}] not found`
      );
      return;
    }

    const responsePayload: WSResponse = {
      type: WSResponseTypes.FailCreateGame,
      payload: { error: payload.error },
    };
    firstPlayerClient.send(JSON.stringify(responsePayload));
    secondPlayerClient.send(JSON.stringify(responsePayload));
  }

  static on3SerialWins(clients: Set<WebSocket>, payload: GameEmitterPayloadWithWinner): void {
    const gameSession = GameSession.findById(payload.gameSessionId);
    if (!gameSession) {
      console.error(`Game session [ID=${payload.gameSessionId}] not found`);
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

    if (!firstPlayerClient || !secondPlayerClient) {
      console.error(
        `First or second player of game session [ID=${payload.gameSessionId}] not found`
      );
      return;
    }

    const message = (playerId): string =>
      playerId === payload.winnerId
        ? 'Congratulations! Rapidly victory!'
        : "Don't be so naive next time";

    const firstPlayerResponse: WSResponse = {
      type: WSResponseTypes.After3SerialWins,
      payload: {
        winnerId: payload.winnerId,
        message: message(firstPlayerClient.id),
      },
    };

    const secondPlayerResponse: WSResponse = {
      type: WSResponseTypes.After3SerialWins,
      payload: {
        winnerId: payload.winnerId,
        message: message(secondPlayerClient.id),
      },
    };

    firstPlayerClient.send(JSON.stringify(firstPlayerResponse));
    secondPlayerClient.send(JSON.stringify(secondPlayerResponse));

    GameSession.deleteById(gameSession.id);
  }

  static on10TotalWins(clients: Set<WebSocket>, payload: GameEmitterPayloadWithWinner) {
    const gameSession = GameSession.findById(payload.gameSessionId);
    if (!gameSession) {
      console.error(`Game session [ID=${payload.gameSessionId}] not found`);
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

    if (!firstPlayerClient || !secondPlayerClient) {
      console.error(
        `First or second player of game session [ID=${payload.gameSessionId}] not found`
      );
      return;
    }

    const message = (playerId): string =>
      playerId === payload.winnerId
        ? 'Congratulations! Total victory!'
        : "You fought bravely, maybe you'll have better luck next time";

    const firstPlayerResponse: WSResponse = {
      type: WSResponseTypes.After10TotalWins,
      payload: {
        winnerId: payload.winnerId,
        message: message(firstPlayerClient.id),
      },
    };

    const secondPlayerResponse: WSResponse = {
      type: WSResponseTypes.After10TotalWins,
      payload: {
        winnerId: payload.winnerId,
        message: message(secondPlayerClient.id),
      },
    };

    firstPlayerClient.send(JSON.stringify(firstPlayerResponse));
    secondPlayerClient.send(JSON.stringify(secondPlayerResponse));

    GameSession.deleteById(gameSession.id);
  }
}
