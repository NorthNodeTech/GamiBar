import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type PlayerState = {
  name: string;
  xp: number;
  coins: number;
  streak: number;
  gamesPlayed: number;
  correct: number;
  answered: number;
  achievements: string[];
  history: { game: string; xp: number; at: number }[];
};

const INITIAL: PlayerState = {
  name: "Student User",
  xp: 2480,
  coins: 640,
  streak: 6,
  gamesPlayed: 27,
  correct: 198,
  answered: 231,
  achievements: ["Perfect Score", "Quiz Master"],
  history: [
    { game: "Quiz Challenge", xp: 180, at: Date.now() - 3600_000 },
    { game: "Connect Dots", xp: 240, at: Date.now() - 86_400_000 },
    { game: "Jigsaw Mission", xp: 200, at: Date.now() - 172_800_000 },
  ],
};

const KEY = "gamibar.player.v1";

export function levelFromXp(xp: number) {
  return Math.max(1, Math.floor(xp / 500) + 1);
}
export function levelProgress(xp: number) {
  return (xp % 500) / 500;
}

type Ctx = {
  player: PlayerState;
  award: (game: string, xp: number, coins?: number) => void;
  recordAnswers: (correct: number, answered: number) => void;
  unlock: (achievement: string) => void;
};

const PlayerContext = createContext<Ctx | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<PlayerState>(INITIAL);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) setPlayer({ ...INITIAL, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(player));
    } catch {
      /* ignore */
    }
  }, [player]);

  const award = useCallback((game: string, xp: number, coins = Math.round(xp / 4)) => {
    setPlayer((p) => ({
      ...p,
      xp: p.xp + xp,
      coins: p.coins + coins,
      gamesPlayed: p.gamesPlayed + 1,
      history: [{ game, xp, at: Date.now() }, ...p.history].slice(0, 12),
    }));
  }, []);

  const recordAnswers = useCallback((correct: number, answered: number) => {
    setPlayer((p) => ({ ...p, correct: p.correct + correct, answered: p.answered + answered }));
  }, []);

  const unlock = useCallback((achievement: string) => {
    setPlayer((p) =>
      p.achievements.includes(achievement)
        ? p
        : { ...p, achievements: [...p.achievements, achievement] },
    );
  }, []);

  const value = useMemo(
    () => ({ player, award, recordAnswers, unlock }),
    [player, award, recordAnswers, unlock],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used inside PlayerProvider");
  return ctx;
}