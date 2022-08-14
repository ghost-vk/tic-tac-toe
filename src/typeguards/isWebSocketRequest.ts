import { isInWSActions, WSActions, WSRequest } from '../types/ws';

/**
 * Function checks websocket request type with predicates
 *
 * @param { WSRequest } request => WebSocket request
 * @returns { boolean }
 */
export function isWebSocketRequest(request: WSRequest): request is WSRequest {
  if (!request || !isInWSActions(request.action)) return false;

  if (!request.payload) return false;

  if (request.action === WSActions.AcceptInvite) {
    if (typeof request.payload?.inviteId !== 'string') {
      return false;
    }
  } else if (request.action === WSActions.CreateGame) {
    if (
      typeof request.payload?.gameSessionId !== 'string' ||
      typeof request.payload?.boardSize !== 'number'
    ) {
      return false;
    }
  } else if (request.action === WSActions.MakeStep) {
    if (
      !request.payload?.actor ||
      typeof request.payload.actor?.id !== 'string' ||
      typeof request.payload?.x !== 'number' ||
      typeof request.payload?.y !== 'number' ||
      typeof request.payload?.gameSessionId !== 'string'
    ) {
      return false;
    }
  } else {
    return false;
  }

  return true;
}
