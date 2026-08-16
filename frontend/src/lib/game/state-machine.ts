/**
 * Explicit room / round lifecycle. Prefer this over scattered booleans.
 */
export type RoomStatus =
  | "DRAFT"
  | "LOBBY"
  | "READY"
  | "COUNTDOWN"
  | "LIVE"
  | "FINISHED"
  | "CANCELLED";

export type ParticipantStatus = "ONLINE" | "DISCONNECTED" | "PLAYING" | "COMPLETED";

const TRANSITIONS: Record<RoomStatus, readonly RoomStatus[]> = {
  DRAFT: ["LOBBY", "CANCELLED"],
  LOBBY: ["READY", "COUNTDOWN", "LIVE", "CANCELLED"],
  READY: ["COUNTDOWN", "LIVE", "LOBBY", "CANCELLED"],
  COUNTDOWN: ["LIVE", "CANCELLED"],
  LIVE: ["FINISHED", "CANCELLED"],
  FINISHED: [], // new round = new room / new game config
  CANCELLED: [],
};

export function canTransition(from: RoomStatus, to: RoomStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(from: RoomStatus, to: RoomStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid room transition: ${from} → ${to}`);
  }
}

/** Students may only join rooms that are open for entry. */
export function canStudentsJoin(status: RoomStatus): boolean {
  return status === "LOBBY" || status === "READY";
}

/** Students may re-enter with the same name while a round is active. */
export function canStudentsRejoin(status: RoomStatus): boolean {
  return status === "LIVE" || status === "COUNTDOWN";
}

export function canStudentEnterRoom(status: RoomStatus): boolean {
  return canStudentsJoin(status) || canStudentsRejoin(status);
}

export function isTerminal(status: RoomStatus): boolean {
  return status === "FINISHED" || status === "CANCELLED";
}
