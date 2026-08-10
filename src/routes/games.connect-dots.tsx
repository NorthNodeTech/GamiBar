import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ConnectDots } from "@/components/games/ConnectDots";
import { GameShell } from "@/components/games/GameShell";
import { Button } from "@/components/ui/button";
import { generateConnectDotsPuzzle, type ConnectDotsDifficulty } from "@/lib/connect-dots";
import { usePlayer } from "@/lib/player-store";

export const Route = createFileRoute("/games/connect-dots")({
  head: () => ({
    meta: [
      { title: "Connect Dots - GamiBar" },
      {
        name: "description",
        content: "Connect matching coloured dots and complete every path as fast as possible.",
      },
      { property: "og:title", content: "Connect Dots - GamiBar" },
      {
        property: "og:description",
        content: "Connect matching dots and complete every path before time runs out.",
      },
    ],
  }),
  component: ConnectDotsGame,
});

function ConnectDotsGame() {
  const { award } = usePlayer();
  const [difficulty, setDifficulty] = useState<ConnectDotsDifficulty>("medium");
  const [seed, setSeed] = useState(0);
  const [finished, setFinished] = useState(false);

  const puzzle = useMemo(() => generateConnectDotsPuzzle(difficulty), [difficulty, seed]);

  const regenerate = () => {
    setFinished(false);
    setSeed((s) => s + 1);
  };

  return (
    <GameShell
      title="Connect Dots"
      subtitle="Connect every matching pair of dots. Complete the board as fast as possible."
      progress={finished ? 1 : 0}
      progressLabel={finished ? "Complete" : "In progress"}
    >
      <div className="mx-auto max-w-xl space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {(["easy", "medium", "hard"] as const).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => {
                setDifficulty(level);
                setFinished(false);
                setSeed((s) => s + 1);
              }}
              className={
                difficulty === level
                  ? "rounded-xl bg-[var(--game-connect-dots)] px-3 py-1.5 text-xs font-bold text-white"
                  : "rounded-xl border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)]"
              }
            >
              {level[0]!.toUpperCase() + level.slice(1)}
            </button>
          ))}
          <Button type="button" variant="outline" className="ml-auto h-9 rounded-xl" onClick={regenerate}>
            New puzzle
          </Button>
        </div>

        <div className="rounded-[24px] border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] p-4 shadow-[var(--shadow-soft)] sm:p-6">
          <ConnectDots
            key={`${difficulty}-${seed}`}
            board={puzzle.publicBoard}
            disabled={finished}
            onComplete={() => {
              if (finished) return;
              setFinished(true);
              const xp = difficulty === "hard" ? 280 : difficulty === "medium" ? 220 : 160;
              award("Connect Dots", xp);
              toast.success(`Board complete - ${xp} XP earned`);
            }}
          />
        </div>
      </div>
    </GameShell>
  );
}
