export type InviteStatus = 'pending' | 'accepted' | 'declined';

export type InviteData = {
  id: string;
  actorId: string;
  invitedPlayerId: string;
  status: InviteStatus;
};
