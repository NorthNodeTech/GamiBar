const AUTHOR_KEY = "gamibar.author.room.v1";
const PARTICIPANT_KEY = "gamibar.participant.v1";
const PARTICIPANT_BACKUP_KEY = "gamibar.participant.backup.v1";

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
  if (storageAvailable("sessionStorage")) {
    sessionStorage.setItem(AUTHOR_KEY, JSON.stringify(session));
  }
  if (storageAvailable("localStorage")) {
    localStorage.setItem(`${AUTHOR_KEY}.${session.roomId}`, JSON.stringify(session));
  }
}

export function loadAuthorRoom(roomId?: string): AuthorRoomSession | null {
  try {
    if (roomId && storageAvailable("localStorage")) {
      const byRoom = localStorage.getItem(`${AUTHOR_KEY}.${roomId}`);
      if (byRoom) return JSON.parse(byRoom) as AuthorRoomSession;
    }
    if (storageAvailable("sessionStorage")) {
      const raw = sessionStorage.getItem(AUTHOR_KEY);
      if (raw) return JSON.parse(raw) as AuthorRoomSession;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearAuthorRoom(roomId?: string) {
  if (storageAvailable("sessionStorage")) {
    sessionStorage.removeItem(AUTHOR_KEY);
  }
  if (storageAvailable("localStorage")) {
    if (roomId) {
      localStorage.removeItem(`${AUTHOR_KEY}.${roomId}`);
    } else {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith(AUTHOR_KEY)) {
          localStorage.removeItem(key);
        }
      }
    }
  }
}

function storageAvailable(type: "sessionStorage" | "localStorage"): boolean {
  try {
    return typeof globalThis[type] !== "undefined";
  } catch {
    return false;
  }
}

function parseParticipantSession(raw: string | null): ParticipantSession | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ParticipantSession;
  } catch {
    return null;
  }
}

export function saveParticipantSession(session: ParticipantSession) {
  const serialized = JSON.stringify(session);
  if (storageAvailable("sessionStorage")) {
    sessionStorage.setItem(PARTICIPANT_KEY, serialized);
  }
  if (storageAvailable("localStorage")) {
    localStorage.setItem(PARTICIPANT_BACKUP_KEY, serialized);
  }
}

export function loadParticipantSession(): ParticipantSession | null {
  if (!storageAvailable("sessionStorage") && !storageAvailable("localStorage")) {
    return null;
  }

  const fromSession = storageAvailable("sessionStorage")
    ? parseParticipantSession(sessionStorage.getItem(PARTICIPANT_KEY))
    : null;
  if (fromSession) return fromSession;

  const fromBackup = storageAvailable("localStorage")
    ? parseParticipantSession(localStorage.getItem(PARTICIPANT_BACKUP_KEY))
    : null;
  if (fromBackup && storageAvailable("sessionStorage")) {
    sessionStorage.setItem(PARTICIPANT_KEY, JSON.stringify(fromBackup));
    return fromBackup;
  }

  return fromBackup;
}

export function clearParticipantSession() {
  if (storageAvailable("sessionStorage")) {
    sessionStorage.removeItem(PARTICIPANT_KEY);
  }
  if (storageAvailable("localStorage")) {
    localStorage.removeItem(PARTICIPANT_BACKUP_KEY);
  }
}
