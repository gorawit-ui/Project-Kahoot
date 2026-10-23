export function removalErrorStatus(message: string) {
  if (message.includes("HOST_UNAUTHORIZED")) return 403;
  if (message.includes("ROOM_NOT_FOUND")) return 404;
  if (message.includes("LOBBY_CLOSED")) return 409;
  if (message.includes("INVALID_REMOVAL")) return 400;
  return 500;
}
