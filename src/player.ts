import { randomUUID } from 'crypto';

let playerStorage: PlayerDto[] = [];

export class PlayerDto {
  constructor(
    public id: string,
  ) {}
}

export class Player {
  constructor(public player: PlayerDto) {}

  get id() {
    return this.player.id;
  }

  toDto() {
    return this.player;
  }

  static create(): Player {
    const id = randomUUID();
    const player = new PlayerDto(id)
    playerStorage.push(player);
    return new Player(player);
  }
  
  static deletePlayer(id: string): void {
    playerStorage = playerStorage.filter((p: PlayerDto) => p.id !== id);
  }
}
