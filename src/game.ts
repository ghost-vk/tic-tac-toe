import { Player, PlayerDto } from './player';

export class GameDto {
  constructor(
    public firstPlayer: PlayerDto,
    public secondPlayer: PlayerDto,
    public size: number,
  ) { }
}

type FieldValueTruthy = 'X' | 'O';
type FieldValue = FieldValueTruthy | null;

type Step<T extends FieldValueTruthy> = {
  actor: Player,
  x: number,
  y: number,
  value: T, 
}

interface FixedLengthArray<
    T extends unknown, 
    L extends number
  > extends Array<T> {
    "0": T;
    length: L;
}

type BoardRow<Length extends number> = FixedLengthArray<FieldValue, Length>
type Board<Length extends number> = FixedLengthArray<BoardRow<Length>, Length>

export function isBoardType<Length extends number>(board: Array<FieldValue[]>, size: Length): board is Board<Length> {
  if (board.length !== size) return false;

  for (let i = 0; i < size; i += 1) {
    if (board[i].length !== size) return false;

    for (let j = 0; j < size; j += 1) {
      const val = board[i][j];
      if (!(val === 'X' || val === 'O' || val === null)) return false;
    }
  }

  return true;
}

export class Game<BoardLength extends number> {
  public firstPlayer: Player;
  public secondPlayer: Player;
  private readonly boardSize: BoardLength;
  private board: Board<BoardLength>;

  constructor(game: GameDto) {
    this.firstPlayer = new Player(game.firstPlayer);
    this.secondPlayer = new Player(game.secondPlayer);
    this.boardSize = game.size as BoardLength;
    this.buildBoard();
  }

  buildBoard() {
    const board: Array<FieldValue[]> = [];
    for (let i = 0; i < this.boardSize; i += 1) {
      const boardRow: FieldValue[]  = [];  
      for (let j = 0; j < this.boardSize; j += 1) {
        boardRow.push(null);
      }
      board.push(boardRow);
    }

    if (!isBoardType(board, this.boardSize)) {
      throw new Error('Failed build board');
    }

    this.board = board;
  }

  logBoard() {
    for(let i = 0; i < this.boardSize; i += 1) {
      let row = '';
      for(let j = 0; j < this.boardSize; j += 1) {
        const val = this.board[i][j];
        const displayValue = val === 'O' ? '⭕️' : val === 'X' ? '❌' : ' ';
        row += displayValue; 
        if (j !== this.boardSize-1) {
          row += ' ';
        }
      }
      console.log(row);
    }
  }
}
