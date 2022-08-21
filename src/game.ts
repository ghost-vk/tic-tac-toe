import { Player, PlayerDto } from './player';
import { randomUUID } from 'crypto';
import { gameEmitter } from './events/gameEmitter';
import { GameError } from './exceptions/gameError';
import { Board, BoardRow, FieldValue, Step, StepResult } from './types/game';

/**
 * Class responsible for the shape of the data
 * for building the game
 */
export class GameDto {
  constructor(
    public firstPlayer: PlayerDto,
    public secondPlayer: PlayerDto,
    public size: number,
    public isEnded?: boolean
  ) {}
}

/**
 * Main game core class responsible for game logic
 */
export class Game {
  public readonly id: string;
  public readonly firstPlayer: Player;
  public readonly secondPlayer: Player;
  public readonly boardSize: number;
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

  /**
   * Returns current board state
   *
   * @returns { Board }
   */
  get board(): Board {
    return this._board;
  }

  /**
   * Returns player which make last step if game ended
   *
   * @returns { PlayerDto | null }
   */
  get winner(): PlayerDto | null {
    if (!this.isEnded) return null;
    return this.history.length > 0 ? this.history.slice(-1)[0].actor : null;
  }

  /**
   * Method builds board with given dimensions and fill cells null values
   *
   * @returns { void }
   */
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

  /**
   * Method performs step capability checks and call
   * [makeStep]{@link Game.makeStep} if step is possible.
   *
   * Side effects:
   *   - Prints current state of game board
   *
   * @param { Step } step => Step which need to be performed
   * @returns { StepResult }
   */
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

  /**
   * Method prints the current state of game board in multiple lines
   * for ease of debugging
   *
   * @returns { void }
   */
  public logBoard(): void {
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

  /**
   * Method compares actor from step with first and second player.
   * Returns error if actor not matches players in game.
   *
   * @param { Step } step => Step to check
   * @returns { true | GameError }
   */
  checkPlayerBelongsGame(step: Step): true | GameError {
    if (step.actor.id !== this.firstPlayer.id && step.actor.id !== this.secondPlayer.id) {
      return new GameError('A player outside the game has no right to step');
    }
    return true;
  }

  /**
   * Method returns error if game already ended
   *
   * @returns { false | GameError }
   */
  getErrorIfGameEnded(): false | GameError {
    if (this.isEnded) return new GameError('Game already ended');
    return false;
  }

  /**
   * Method compares step actor and actor in last step. If actors are matched
   * returns error. One player replay protection.
   *
   * @param { Step } step => Step to check
   * @returns { true | GameError }
   */
  checkUserCanStep(step: Step): true | GameError {
    if (this.history.length === 0) {
      if (step.actor.id === this.firstPlayer.id) return true;
      return new GameError('First step is for "X" player');
    }
    const lastStep = this.history.slice(-1)[0];
    if (step.actor.id === lastStep.actor.id) {
      return new GameError("Wait for the opponent's step");
    }
    return true;
  }

  /**
   * The method checks the availability of the desired coordinates and saves
   * step to board.
   *
   * Side effects:
   *   - Saves step to history
   *   - Start timeout to control time per step
   *
   * @private
   * @param { Step } step => Step to be taken
   * @returns { true | GameError }
   */
  private makeStep(step: Step): true | GameError {
    if (step.x < 0 || step.x > this.boardSize - 1) {
      return new GameError('Unavailable x coord');
    }

    if (step.y < 0 || step.y > this.boardSize - 1) {
      return new GameError('Unavailable y coord');
    }

    if (this.board[step.y][step.x] !== null) {
      return new GameError(`Cell with coordinates (${step.x}, ${step.y}) is already placed`);
    }

    this.board[step.y][step.x] = step.actor.id === this.firstPlayer.id ? 'X' : 'O';

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
  private controlTimeToStep(step: Step): void {
    const lastStep = this.history.slice(-1)[0];
    if (step.actor === lastStep.actor && step.x === lastStep.x && step.y === lastStep.y) {
      gameEmitter.onStepTimeout({ gameId: this.id, winnerId: step.actor.id });
    }
  }

  /**
   * Method checks win in all directions: horizontally, vertically, diagonally
   *
   * @private
   * @returns { boolean }
   */
  private isWin(): boolean {
    if (this.checkWinHorizontally()) return true;
    if (this.checkWinVertically()) return true;
    if (this.checkWinDiagonallyFromLeftUp()) return true;
    return this.checkWinDiagonallyFromRightUp();
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
  private checkWinHorizontally(): boolean {
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
  private checkWinVertically(): boolean {
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
  private checkWinDiagonallyFromLeftUp(): boolean {
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
  private checkWinDiagonallyFromRightUp(): boolean {
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
}
