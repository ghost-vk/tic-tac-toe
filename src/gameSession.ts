import { Game, GameDto } from './game';
import { GameList } from './gameList';
import { PlayerDto } from './player';
import { randomUUID } from 'crypto';

let gameSessions: GameSession[] = [];

export class GameSession {
  public id: string;
  public firstPlayerWinCount: number = 0;
  public secondPlayerWinCount: number = 0;
  public currentGame: Game | null = null;

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

  makeGame(boardSize: number): Game {
    const gameDto = new GameDto(this._firstPlayer, this._secondPlayer, boardSize);
    const game = new Game(gameDto);
    GameList.add(game);
    this.currentGame = game;
    return game;
  }

  addWinCount(playerId: string): void {
    if (playerId === this._firstPlayer.id) {
      this.firstPlayerWinCount += 1;
    } else if (playerId === this._secondPlayer.id) {
      this.secondPlayerWinCount += 1;
    } else {
      console.error(
        `Fail to add win count. Player [ID=${playerId}] not found in Game session [ID=${this.id}]`
      );
    }
  }
}
