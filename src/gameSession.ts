import { Game, GameDto } from './game';
import { GameList } from './gameList';
import { PlayerDto } from './player';
import { randomUUID } from 'crypto';
import { gameEmitter } from './events/gameEmitter';
import { GameSessionError } from './exceptions/gameSessionError';

let gameSessions: GameSession[] = [];

type GameHistoryItem = {
  gameId: string;
  winnerId: string;
};

/**
 * Class responsible for storing the state of the current game
 * of two players and the history of past games
 */
export class GameSession {
  public id: string;
  public firstPlayerWinCount: number = 0;
  public secondPlayerWinCount: number = 0;
  public currentGame: Game | null = null;
  public gameHistory: GameHistoryItem[] = [];
  /**
   * ID of final winner player, determined after 3 wins serial or 10 wins total
   */
  public finalWinnerId: string;
  /**
   * Shows whether it is possible to create new games within the current session
   * @private
   */
  private canMakeNewGame = true;

  constructor(
    public readonly _firstPlayer: PlayerDto,
    public readonly _secondPlayer: PlayerDto,
    public readonly inviteId: string
  ) {
    this.id = randomUUID();
    gameSessions.push(this);
  }

  /**
   * Method finds game session by {@link Invite} ID
   *
   * @param { string } inviteId => ID of invite related to game session
   * @returns { GameSession | undefined }
   */
  static findByInviteId(inviteId: string): GameSession | undefined {
    return gameSessions.find((gs: GameSession) => gs.inviteId === inviteId);
  }

  /**
   * Method finds game session by ID
   *
   * @param { string } gameSessionId => ID of game session
   * @returns { GameSession | undefined }
   */
  static findById(gameSessionId: string): GameSession | undefined {
    return gameSessions.find((gs: GameSession) => gs.id === gameSessionId);
  }

  /**
   * Method finds game session by [current game]{@link Game} ID
   *
   * @param { string } gameId => ID of current {@link Game} in game session
   * @returns { GameSession | undefined }
   */
  static findByGameId(gameId: string): GameSession | undefined {
    return gameSessions.find((gs: GameSession) => gs.currentGame && gs.currentGame.id === gameId);
  }

  /**
   * Method finds game session by one of [players]{@link Player}
   *
   * @param { string } playerId => One of players ID
   * @returns { GameSession | undefined }
   */
  static findByPlayerId(playerId: string): GameSession | undefined {
    return gameSessions.find(
      (gs: GameSession) => gs._firstPlayer.id === playerId || gs._secondPlayer.id === playerId
    );
  }

  /**
   * Method deletes {@link GameSession} from list
   *
   * @param { string } gameSessionId => ID of game session to delete
   * @returns { void }
   */
  static deleteById(gameSessionId: string): void {
    gameSessions = gameSessions.filter((gs: GameSession) => gs.id !== gameSessionId);
  }

  /**
   * Method creates new game if possible
   *
   * Side effects:
   *   - Add created game to game list
   *
   * @param { number } boardSize => Size of game board (3 = 3x3, 4 = 4x4, ..)
   * @returns { Game | GameSessionError }
   */
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

  /**
   * Method adds win count to one of player
   *
   * Side effects:
   *   - Adds current game to history
   *   - Emit event {@link GameActions.On10TotalWins}
   *   - Emit event {@link GameActions.OnFailCreateGame}
   *
   * @param { string } playerId => Winner player ID
   * @returns { void }
   */
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
        this.finalWinnerId = this._firstPlayer.id;
        this.canMakeNewGame = false;
        return;
      }
      if (this.maxWinCountSerial(this._firstPlayer.id) >= 3) {
        gameEmitter.on3SerialWins({ gameSessionId: this.id, winnerId: this._firstPlayer.id });
        this.finalWinnerId = this._firstPlayer.id;
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
        this.finalWinnerId = this._secondPlayer.id;
        this.canMakeNewGame = false;
        return;
      }
      if (this.maxWinCountSerial(this._secondPlayer.id) >= 3) {
        gameEmitter.on3SerialWins({ gameSessionId: this.id, winnerId: this._secondPlayer.id });
        this.finalWinnerId = this._secondPlayer.id;
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
    let longestWins = 0;
    let prevWinnerId = this.gameHistory[0].winnerId;
    let currentWins = 0;

    for (let i = 0; i < this.gameHistory.length; i += 1) {
      const game = this.gameHistory[i];
      const winnerMatch = game.winnerId === prevWinnerId;
      const isLastGame = i === this.gameHistory.length - 1;
      if (!winnerMatch) {
        if (currentWins > longestWins) {
          longestWins = currentWins;
        }
        currentWins = 0;
      } else if (isLastGame) {
        if (winnerMatch) currentWins += 1;
        if (currentWins > longestWins) {
          longestWins = currentWins;
        }
      } else {
        currentWins += 1;
      }

      prevWinnerId = game.winnerId;
    }

    return longestWins;
  }
}
