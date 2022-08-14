import { Player, PlayerDto } from './player';
import { randomUUID } from 'crypto';
import { gameEmitter } from './gameEmitter';

export class GameDto {
  constructor(
    public firstPlayer: PlayerDto,
    public secondPlayer: PlayerDto,
    public size: number,
    public isEnded?: boolean
  ) {}
}

type FieldValueTruthy = 'X' | 'O';
type FieldValue = FieldValueTruthy | null;

export type StepCoords = {
  x: number;
  y: number;
};

export type Step = { actor: PlayerDto } & StepCoords;

type BoardRow = FieldValue[];
export type Board = BoardRow[];

export type StepResult = {
  isEnded: boolean;
  winner: PlayerDto | null;
  errors: string[];
};

class GameError extends Error {}

export class Game {
  public readonly id: string;
  public readonly firstPlayer: Player;
  public readonly secondPlayer: Player;
  private readonly boardSize: number;
  /**
   * Game board contains current state
   */
  private _board: Board;
  private history: Step[] = [];
  public isEnded = false;

  constructor(game: GameDto) {
    if (game.size < 3) {
      throw new GameError('Board should be at least 3x3');
    }
    this.id = randomUUID();
    this.firstPlayer = new Player(game.firstPlayer);
    this.secondPlayer = new Player(game.secondPlayer);
    this.boardSize = game.size;
    this.buildBoard();
    if (game.isEnded !== undefined) {
      this.isEnded = game.isEnded;
    }
  }

  buildBoard(): void {
    const board: Board = [];
    for (let i = 0; i < this.boardSize; i += 1) {
      const boardRow: BoardRow = [];
      for (let j = 0; j < this.boardSize; j += 1) {
        boardRow.push(null);
      }
      board.push(boardRow);
    }

    this._board = board;
  }

  get board(): Board {
    return this._board;
  }

  get winner(): PlayerDto | null {
    if (!this.isEnded) return null;
    return this.history.length > 0 ? this.history.slice(-1)[0].actor : null;
  }

  next(step: Step): StepResult {
    let errors: string[] = [];

    const isPlayerInGame = this.checkPlayerBelongsGame(step);
    if (isPlayerInGame instanceof GameError) {
      errors.push(isPlayerInGame.message);
      return {
        isEnded: this.isEnded,
        winner: null,
        errors,
      };
    }

    const gameEndedError = this.getErrorIfGameEnded();
    if (gameEndedError instanceof GameError) {
      errors.push(gameEndedError.message);
      const winner = this.winner;
      return {
        isEnded: true,
        winner,
        errors,
      };
    }

    const checkResult = this.checkUserCanStep(step);
    if (checkResult instanceof GameError) {
      errors.push(checkResult.message);
      return {
        isEnded: false,
        winner: null,
        errors,
      };
    }

    const stepResult = this.makeStep(step);
    if (stepResult instanceof GameError) {
      errors.push(stepResult.message);
      return {
        isEnded: false,
        winner: null,
        errors,
      };
    }

    this.logBoard();

    const isWin = this.isWin();
    if (isWin) {
      this.isEnded = true;
    }
    const winner = isWin ? step.actor : null;
    return {
      isEnded: isWin,
      winner,
      errors,
    };
  }

  checkPlayerBelongsGame(step: Step): true | GameError {
    if (step.actor.id !== this.firstPlayer.id && step.actor.id !== this.secondPlayer.id) {
      return new GameError('A player outside the game has no right to step');
    }
    return true;
  }

  getErrorIfGameEnded(): false | GameError {
    if (this.isEnded) return new GameError('Game already ended');
    return false;
  }

  checkUserCanStep(step: Step): true | GameError {
    if (this.history.length === 0) return true;
    const lastStep = this.history.slice(-1)[0];
    if (step.actor.id === lastStep.actor.id) {
      return new GameError("Wait for the opponent's step");
    }
    return true;
  }

  makeStep(step: Step): true | GameError {
    if (step.x < 0 || step.x > this.boardSize - 1) {
      return new GameError('Unavailable x coord');
    }

    if (step.y < 0 || step.y > this.boardSize - 1) {
      return new GameError('Unavailable y coord');
    }

    if (this.board[step.y][step.x] !== null) {
      return new GameError(`Cell with coordinates (${step.x}, ${step.y}) is already placed`);
    }

    const cellValue: FieldValueTruthy = step.actor.id === this.firstPlayer.id ? 'X' : 'O';
    this.board[step.y][step.x] = cellValue;

    this.history.push(step);

    /**
     * 15 seconds for step or game over
     */
    setTimeout(() => this.controlTimeToStep(step), 15000);
    return true;
  }

  /**
   * The method is a callback called after a step, providing the game rule:
   * 15 seconds per move. Only fires if no other steps have been made since
   * the passed step.
   *
   * Side effects:
   *   - Emit event through game emitter
   *
   * @param { Step } step => Step for check in callback
   * @returns { void }
   */
  controlTimeToStep(step: Step): void {
    const lastStep = this.history.slice(-1)[0];
    if (step.actor === lastStep.actor && step.x === lastStep.x && step.y === lastStep.y) {
      gameEmitter.onStepTimeout({ gameId: this.id, winnerId: step.actor.id });
    }
  }

  isWin(): boolean {
    if (this.checkWinHorizontally()) return true;
    if (this.checkWinVertically()) return true;
    return this.checkWinDiagonally();
  }

  /**
   * Method goes horizontally from the left to right of each row
   * and compares each element to the first element in row
   *
   * @example
   *   With board below 👇
   *   [
   *     ['O', 'O', 'O'],
   *     ['X', 'X', 'X'],
   *     ['O', 'O', 'O'],
   *   ]
   *   returns true
   * @returns { boolean } Shows if all diagonal elements are equal
   */
  checkWinHorizontally(): boolean {
    for (const row of this.board) {
      const firstElement = row[0];
      if (firstElement === null) continue;
      const isNotMatchFirstElement = row.every(
        (rowElement: FieldValue) => rowElement === firstElement
      );
      if (!isNotMatchFirstElement) continue;
      return true;
    }
    return false;
  }

  /**
   * Method goes vertically from the top to bottom of each row
   * and compares each element to the first top element in row
   *
   * @example
   *   With board below 👇
   *   [
   *     ['O', 'X', 'O'],
   *     ['O', 'X', 'O'],
   *     ['O', 'X', 'O'],
   *   ]
   *   returns true
   * @returns { boolean } Shows if all diagonal elements are equal
   */
  checkWinVertically(): boolean {
    for (let i = 0; i < this.boardSize; i += 1) {
      const firstElement = this.board[0][i];
      if (firstElement === null) continue;
      const isNotMatchFirstElement = this.board.every(
        (row: FieldValue[]) => row[i] === firstElement
      );
      if (!isNotMatchFirstElement) continue;
      return true;
    }
    return false;
  }

  checkWinDiagonally(): boolean {
    if (this.checkWinDiagonallyFromLeftUp()) return true;
    if (this.checkWinDiagonallyFromRightUp()) return true;
    return false;
  }

  /**
   * Method goes diagonally from the top left element
   * and compares each element to the top left element
   *
   * @example
   *   With board below 👇
   *   [
   *     ['X', 'O', 'O'],
   *     ['O', 'X', 'O'],
   *     ['O', 'O', 'X'],
   *   ]
   *   returns true
   * @returns { boolean } Shows if all diagonal elements are equal
   */
  checkWinDiagonallyFromLeftUp(): boolean {
    const upperLeftElement = this.board[0][0];
    if (upperLeftElement === null) return false;
    // Zero element is always equal to itself
    for (let i = 1; i < this.boardSize; i += 1) {
      if (this.board[i][i] !== upperLeftElement) return false;
    }
    return true;
  }

  /**
   * Method goes diagonally from the top right element
   * and compares each element to the top right element
   *
   * @example
   *   With board below 👇
   *   [
   *     ['O', 'O', 'X'],
   *     ['O', 'X', 'O'],
   *     ['X', 'O', 'O'],
   *   ]
   *   returns true
   * @returns { boolean } Shows if all diagonal elements are equal
   */
  checkWinDiagonallyFromRightUp(): boolean {
    const lastIdx = this.boardSize - 1;
    const upperRightElement = this.board[0][this.boardSize - 1];
    if (upperRightElement === null) return false;
    for (let horizontalIdx = lastIdx; horizontalIdx >= 0; horizontalIdx -= 1) {
      const verticalIdx = lastIdx - horizontalIdx;
      if (this.board[verticalIdx][horizontalIdx] !== upperRightElement) {
        return false;
      }
    }
    return true;
  }

  logBoard(): void {
    for (let i = 0; i < this.boardSize; i += 1) {
      let row = '[ ';
      for (let j = 0; j < this.boardSize; j += 1) {
        const val = this.board[i][j];
        const displayValue = val ? val : '_';
        row += displayValue + ' ';
        if (j === this.boardSize - 1) {
          row += ']';
        }
      }
      console.log(row);
    }
  }
}
