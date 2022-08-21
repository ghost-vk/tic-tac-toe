import EventEmitter from 'events';

export enum ConnectionEvents {
  Close = 'Close',
}

export type CloseConnectionPayload = {
  playerId: string;
};

export class ConnectionEmitter extends EventEmitter {
  onCloseConnection(payload: CloseConnectionPayload): void {
    this.emit(ConnectionEvents.Close, payload);
  }
}

export const connectionEmitter = new ConnectionEmitter();
