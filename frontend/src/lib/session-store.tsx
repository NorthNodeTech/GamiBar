import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ActivityMode = "quiz" | "jigsaw" | "connect_dots";

export type SessionActivity = {
  id: string;
  mode: ActivityMode;
  title: string;
  detail: string;
  status: "upcoming" | "active" | "completed";
};

export type LobbyPlayer = {
  id: string;
  name: string;
  joinedAt: number;
};

export type LiveSession = {
  id: string;
  name: string;
  hostName: string;
  code: string;
  subject: string;
  status: "lobby" | "live" | "ended";
  maxPlayers: number;
  players: LobbyPlayer[];
  activities: SessionActivity[];
  createdAt: number;
};

type SessionContextValue = {
  sessions: LiveSession[];
  activeSession: LiveSession | null;
  createSession: (input: {
    name: string;
    subject: string;
    hostName: string;
    activities?: SessionActivity[];
  }) => LiveSession;
  joinSession: (code: string, nickname: string) => { ok: true; session: LiveSession } | { ok: false; error: string };
  getByCode: (code: string) => LiveSession | undefined;
  setLive: (id: string) => void;
  endSession: (id: string) => void;
};

const STORAGE_KEY = "gamibar.sessions.v1";

const defaultActivities = (): SessionActivity[] => [
  {
    id: "a1",
    mode: "quiz",
    title: "Quiz Challenge",
    detail: "10 Questions",
    status: "upcoming",
  },
  {
    id: "a2",
    mode: "jigsaw",
    title: "Jigsaw Mission",
    detail: "1 Mission",
    status: "upcoming",
  },
  {
    id: "a3",
    mode: "connect_dots",
    title: "Connect Dots",
    detail: "Grid puzzle",
    status: "upcoming",
  },
];

const seedSession = (): LiveSession => ({
  id: "seed-1",
  name: "Biology Battle",
  hostName: "Quiz Author",
  code: "845721",
  subject: "Biology",
  status: "lobby",
  maxPlayers: 30,
  players: [
    { id: "p1", name: "Anwar", joinedAt: Date.now() - 60000 },
    { id: "p2", name: "Sneha", joinedAt: Date.now() - 55000 },
    { id: "p3", name: "Eswar", joinedAt: Date.now() - 50000 },
    { id: "p4", name: "Rahul", joinedAt: Date.now() - 45000 },
    { id: "p5", name: "Aisha", joinedAt: Date.now() - 40000 },
  ],
  activities: defaultActivities().map((a, i) =>
    i === 0 ? { ...a, status: "active" as const } : a,
  ),
  createdAt: Date.now() - 120000,
});

function loadSessions(): LiveSession[] {
  if (typeof window === "undefined") return [seedSession()];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [seedSession()];
    const parsed = JSON.parse(raw) as LiveSession[];
    return parsed.length ? parsed : [seedSession()];
  } catch {
    return [seedSession()];
  }
}

function randomCode() {
  let code = "";
  for (let i = 0; i < 6; i++) code += String(Math.floor(Math.random() * 10));
  return code;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<LiveSession[]>(() => [seedSession()]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSessions(loadSessions());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions, hydrated]);

  const createSession = useCallback(
    (input: {
      name: string;
      subject: string;
      hostName: string;
      activities?: SessionActivity[];
    }) => {
      const session: LiveSession = {
        id: `s-${Date.now()}`,
        name: input.name.trim() || "Classroom Session",
        hostName: input.hostName,
        code: randomCode(),
        subject: input.subject.trim() || "General",
        status: "lobby",
        maxPlayers: 30,
        players: [],
        activities: input.activities ?? defaultActivities(),
        createdAt: Date.now(),
      };
      setSessions((prev) => [session, ...prev]);
      return session;
    },
    [],
  );

  const getByCode = useCallback(
    (code: string) => sessions.find((s) => s.code === code.replace(/\s/g, "")),
    [sessions],
  );

  const joinSession = useCallback(
    (code: string, nickname: string) => {
      const clean = code.replace(/\s/g, "");
      const name = nickname.trim();
      if (!name) return { ok: false as const, error: "Enter a nickname." };
      const session = sessions.find((s) => s.code === clean);
      if (!session) return { ok: false as const, error: "Room code not found." };
      if (session.status === "ended") return { ok: false as const, error: "This session has ended." };
      if (session.players.length >= session.maxPlayers) {
        return { ok: false as const, error: "Lobby is full." };
      }
      if (session.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
        return { ok: false as const, error: "That nickname is already taken." };
      }

      const player: LobbyPlayer = { id: `p-${Date.now()}`, name, joinedAt: Date.now() };
      const next = { ...session, players: [...session.players, player] };
      setSessions((prev) => prev.map((s) => (s.id === session.id ? next : s)));
      return { ok: true as const, session: next };
    },
    [sessions],
  );

  const setLive = useCallback((id: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "live" as const } : s)),
    );
  }, []);

  const endSession = useCallback((id: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "ended" as const } : s)),
    );
  }, []);

  const activeSession = useMemo(
    () => sessions.find((s) => s.status === "lobby" || s.status === "live") ?? sessions[0] ?? null,
    [sessions],
  );

  const value = useMemo(
    () => ({
      sessions,
      activeSession,
      createSession,
      joinSession,
      getByCode,
      setLive,
      endSession,
    }),
    [sessions, activeSession, createSession, joinSession, getByCode, setLive, endSession],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSessions() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSessions must be used within SessionProvider");
  return ctx;
}

export function useSessionsSafe() {
  return useContext(SessionContext);
}
