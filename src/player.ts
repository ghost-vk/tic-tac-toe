import { randomUUID } from 'crypto';

let playerStorage: PlayerDto[] = [];

export class PlayerDto {
  constructor(
    public id: string,
  ) {}
}

export class Player {
  constructor(public player: PlayerDto) {}

  get id(): string {
    return this.player.id;
  }

  static get list(): PlayerDto[] {
    return playerStorage;
  }

  static exist(playerId: string): boolean {
    return !!playerStorage.find((p: PlayerDto) => p.id === playerId);
  }

  static findById(playerId: string): PlayerDto | undefined {
    return playerStorage.find((p: PlayerDto) => p.id === playerId);
  }

  toDto(): PlayerDto {
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
