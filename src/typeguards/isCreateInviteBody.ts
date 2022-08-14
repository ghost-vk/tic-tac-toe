type CreateInviteDto = {
  actorId: string;
  invitedPlayerId: string;
};

export function isCreateInviteBody(
  inviteDto: CreateInviteDto
): inviteDto is CreateInviteDto {
  if (!inviteDto) return false;

  if (
    typeof inviteDto.actorId !== "string" ||
    typeof inviteDto.invitedPlayerId !== "string"
  ) {
    return false;
  }

  return true;
}
