const AUTHOR_KEY = "gamibar.author.room.v1";
const PARTICIPANT_KEY = "gamibar.participant.v1";

export type AuthorRoomSession = {
  roomId: string;
  code: string;
  authorToken: string;
};

export type ParticipantSession = {
  roomId: string;
  code: string;
  participantId: string;
  reconnectToken: string;
  displayName: string;
};

export function saveAuthorRoom(session: AuthorRoomSession) {
  sessionStorage.setItem(AUTHOR_KEY, JSON.stringify(session));
}

export function loadAuthorRoom(): AuthorRoomSession | null {
  try {
    const raw = sessionStorage.getItem(AUTHOR_KEY);
    return raw ? (JSON.parse(raw) as AuthorRoomSession) : null;
  } catch {
    return null;
  }
}

export function clearAuthorRoom() {
  sessionStorage.removeItem(AUTHOR_KEY);
}

export function saveParticipantSession(session: ParticipantSession) {
  sessionStorage.setItem(PARTICIPANT_KEY, JSON.stringify(session));
}

export function loadParticipantSession(): ParticipantSession | null {
  try {
    const raw = sessionStorage.getItem(PARTICIPANT_KEY);
    return raw ? (JSON.parse(raw) as ParticipantSession) : null;
  } catch {
    return null;
  }
}
