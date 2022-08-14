import { Player } from "./player";
import { GameSession } from "./gameSession";
import { randomUUID } from "crypto";

import { InviteEmitter } from "./inviteEmitter";

export const inviteEmitter = new InviteEmitter();

export class InviteError extends Error {}

type InviteStatus = "pending" | "accepted" | "declined";

type InviteData = {
  id: string,
  actorId: string,
  invitedPlayerId: string,
  status: InviteStatus
}

let invites: Invite[] = [];

export class Invite {
  constructor(
    public id: string,
    public actorId: string,
    public invitedPlayerId: string,
    public status: InviteStatus = "pending",
  ) {}

  toDto(): InviteData {
    return {
      id: this.id,
      actorId: this.actorId,
      invitedPlayerId: this.invitedPlayerId,
      status: this.status,
    }
  }

  static createInvite(
    actorId: string,
    invitedPlayerId: string
  ): Invite | InviteError {
    if (!Player.exist(actorId)) {
      return new InviteError("Actor not exist");
    }

    if (!Player.exist(invitedPlayerId)) {
      return new InviteError("Invited played not exist");
    }

    if (actorId === invitedPlayerId) {
      return new InviteError("You can't invite yourself");
    }

    const id = randomUUID();
    const invite = new Invite(id, actorId, invitedPlayerId, "pending");

    invites.push(invite);

    inviteEmitter.afterCreateInvite({ inviteId: invite.id });

    return invite;
  }

  static findById(inviteId: string): Invite | undefined {
    return invites.find((i: Invite) => i.id === inviteId);
  }

  static acceptInvite(inviteId: string): GameSession | InviteError {
    const invite = invites.find((i: Invite) => i.id === inviteId);

    if (!invite) {
      return new InviteError("Invite not found");
    }

    if (invite.status !== "pending") {
      return new InviteError("Invite already accepted/declined");
    }

    const firstPlayer = Player.findById(invite.actorId);
    if (!firstPlayer) {
      return new InviteError("Actor not exist");
    }

    const secondPlayer = Player.findById(invite.invitedPlayerId);
    if (!secondPlayer) {
      return new InviteError("Invited played not exist");
    }

    const session = new GameSession(firstPlayer, secondPlayer, invite.id);
    invite.status = "accepted";
    return session;
  }

  static declineInvite(inviteId: string): true | InviteError {
    const invite = invites.find((i: Invite) => i.id === inviteId);

    if (!invite) {
      return new InviteError("Invite not found");
    }

    if (invite.status !== "pending") {
      return new InviteError("Invite already accepted/declined");
    }

    invite.status = "declined";
    return true;
  }
}
