import { PlayerDto } from '../player';

export type FieldValueTruthy = 'X' | 'O';
export type FieldValue = FieldValueTruthy | null;

export type StepCoords = {
  x: number;
  y: number;
};

export type Step = { actor: PlayerDto } & StepCoords;

export type BoardRow = FieldValue[];
export type Board = BoardRow[];

export type StepResult = {
  isEnded: boolean;
  winner: PlayerDto | null;
  errors: string[];
};
