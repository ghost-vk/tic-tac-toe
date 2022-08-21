import EventEmitter from 'events';

export enum InviteActions {
  OnCreateInvite = 'OnCreateInvite',
  OnAcceptInvite = 'OnAcceptInvite',
  OnFailAcceptInvite = 'OnFailAcceptInvite',
}

export type InviteEmitterPayload = {
  inviteId: string;
};

export class InviteEmitter extends EventEmitter {
  afterCreateInvite(payload: InviteEmitterPayload): void {
    this.emit(InviteActions.OnCreateInvite, payload);
  }

  afterFailAcceptInvite(payload: InviteEmitterPayload): void {
    this.emit(InviteActions.OnFailAcceptInvite, payload);
  }

  afterAcceptInvite(payload: InviteEmitterPayload): void {
    this.emit(InviteActions.OnAcceptInvite, payload);
  }
}

export const inviteEmitter = new InviteEmitter();
