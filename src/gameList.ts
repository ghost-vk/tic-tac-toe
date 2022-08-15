import { Game } from './game';

let games: Game[] = [];

export class GameList {
  static add(game: Game): void {
    games.push(game);
  }

  static findById(gameId: string): Game | undefined {
    return games.find((g: Game) => g.id === gameId);
  }
}
