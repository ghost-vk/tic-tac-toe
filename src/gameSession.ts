import { Game, GameDto } from './game';
import { GameList } from './gameList';
import { PlayerDto } from './player';
import { randomUUID } from 'crypto';
import { gameEmitter } from './gameEmitter';
import { GameSessionError } from './exceptions/gameSessionError';

let gameSessions: GameSession[] = [];

type GameHistoryItem = {
  gameId: string;
  winnerId: string;
};

export class GameSession {
  public id: string;
  public firstPlayerWinCount: number = 0;
  public secondPlayerWinCount: number = 0;
  public currentGame: Game | null = null;
  public gameHistory: GameHistoryItem[];
  private canMakeNewGame = true;

  constructor(
    public readonly _firstPlayer: PlayerDto,
    public readonly _secondPlayer: PlayerDto,
    public readonly inviteId: string
  ) {
    this.id = randomUUID();
    gameSessions.push(this);
  }

  static findByInviteId(inviteId: string): GameSession | undefined {
    return gameSessions.find((gs: GameSession) => gs.inviteId === inviteId);
  }

  static findById(gameSessionId: string): GameSession | undefined {
    return gameSessions.find((gs: GameSession) => gs.id === gameSessionId);
  }

  static findByGameId(gameId: string): GameSession | undefined {
    return gameSessions.find((gs: GameSession) => gs.currentGame && gs.currentGame.id === gameId);
  }

  static findByPlayerId(playerId: string): GameSession | undefined {
    return gameSessions.find(
      (gs: GameSession) => gs._firstPlayer.id === playerId || gs._secondPlayer.id === playerId
    );
  }

  static deleteById(gameSessionId: string): void {
    gameSessions = gameSessions.filter((gs: GameSession) => gs.id !== gameSessionId);
  }

  public firstPlayerWinCountSerial(): number {
    return this.maxWinCountSerial(this._firstPlayer.id);
  }

  public secondPlayerWinCountSerial(): number {
    return this.maxWinCountSerial(this._secondPlayer.id);
  }

  public makeGame(boardSize: number): Game | GameSessionError {
    if (!this.canMakeNewGame) {
      return new GameSessionError('You cannot create a game within this session');
    }
    const gameDto = new GameDto(this._firstPlayer, this._secondPlayer, boardSize);
    const game = new Game(gameDto);
    GameList.add(game);
    this.currentGame = game;
    return game;
  }

  public addWinCount(playerId: string): void {
    if (!this.currentGame) {
      console.error(`Current game in game session [ID=${this.id}] is not defined`);
      return;
    }

    if (playerId === this._firstPlayer.id) {
      this.firstPlayerWinCount += 1;
      this.gameHistory.push({
        winnerId: playerId,
        gameId: this.currentGame.id,
      });
      if (this.firstPlayerWinCount >= 10) {
        gameEmitter.on10TotalWins({ gameSessionId: this.id, winnerId: this._firstPlayer.id });
        this.canMakeNewGame = false;
        return;
      }
      if (this.firstPlayerWinCountSerial() >= 3) {
        gameEmitter.on3SerialWins({ gameSessionId: this.id, winnerId: this._firstPlayer.id });
        this.canMakeNewGame = false;
        return;
      }
    } else if (playerId === this._secondPlayer.id) {
      this.secondPlayerWinCount += 1;
      this.gameHistory.push({
        winnerId: playerId,
        gameId: this.currentGame.id,
      });
      if (this.secondPlayerWinCount >= 10) {
        gameEmitter.on10TotalWins({ gameSessionId: this.id, winnerId: this._secondPlayer.id });
        this.canMakeNewGame = false;
        return;
      }
      if (this.secondPlayerWinCountSerial() >= 3) {
        gameEmitter.on3SerialWins({ gameSessionId: this.id, winnerId: this._secondPlayer.id });
        this.canMakeNewGame = false;
        return;
      }
    } else {
      console.error(
        `Fail to add win count. Player [ID=${playerId}] not found in Game session [ID=${this.id}]`
      );
    }
  }

  /**
   * The method calculates the maximum number of serial wins
   *
   * @private
   * @param { string } winnerId => ID of player for which need to calc
   * @returns { number }
   */
  private maxWinCountSerial(winnerId: string): number {
    let max = 0;
    let longestWins = 0;
    let prevWinnerId = '';
    for (const game of this.gameHistory) {
      if (winnerId !== game.winnerId) {
        if (longestWins > max) {
          max = longestWins;
        }
        longestWins = 0;
      }
      if (prevWinnerId === game.winnerId) {
        longestWins += 1;
      } else {
        if (longestWins > max) {
          max = longestWins;
        }
        longestWins = 0;
      }
      prevWinnerId = game.winnerId;
    }
    return max;
  }
}
