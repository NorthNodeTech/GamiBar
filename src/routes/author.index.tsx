import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Blocks, CircleDot, Plus, ScanLine, Zap } from "lucide-react";

import gameConnectDotsPreview from "@/assets/game-connect-dots-preview.png";
import gameJigsawPreview from "@/assets/game-jigsaw-preview.webp";
import gameQuizPreview from "@/assets/game-quiz-preview.webp";
import { AuthorShell } from "@/components/layout/AuthorShell";
import { Button } from "@/components/ui/button";
import type { GameMode } from "@/lib/game/config";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/author/")({
  head: () => ({
    meta: [
      { title: "GamiBAR" },
      {
        name: "description",
        content: "Create or join a live classroom game.",
      },
    ],
  }),
  component: AuthorHome,
});

const gameModes = [
  {
    mode: "quiz" as const,
    title: "Quiz Challenge",
    copy: "10 multiple-choice questions with a live leaderboard.",
    icon: Zap,
    preview: gameQuizPreview,
    ring: "ring-[var(--game-quiz)]/20 hover:border-[var(--game-quiz)]",
    iconTint: "bg-[var(--game-quiz-soft)] text-[var(--game-quiz)]",
  },
  {
    mode: "jigsaw" as const,
    title: "Jigsaw Mission",
    copy: "Upload an image and let students solve the puzzle.",
    icon: Blocks,
    preview: gameJigsawPreview,
    ring: "ring-[var(--game-jigsaw)]/20 hover:border-[var(--game-jigsaw)]",
    iconTint: "bg-[var(--game-jigsaw-soft)] text-[var(--game-jigsaw)]",
  },
  {
    mode: "connect_dots" as const,
    title: "Connect Dots",
    copy: "Connect matching dots and complete every path as fast as possible.",
    icon: CircleDot,
    preview: gameConnectDotsPreview,
    ring: "ring-[var(--game-connect-dots)]/20 hover:border-[var(--game-connect-dots)]",
    iconTint: "bg-[var(--game-connect-dots-soft)] text-[var(--game-connect-dots)]",
  },
] as const;

function AuthorHome() {
  const navigate = useNavigate();

  const openCreateWithMode = (mode: GameMode) => {
    navigate({ to: "/author/create", search: { mode } });
  };

  return (
    <AuthorShell>
      <div className="mx-auto max-w-5xl space-y-12 py-6 sm:py-8">
        <div className="mx-auto flex max-w-lg flex-col items-center px-2 text-center">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#111111] sm:text-4xl">
            Ready to play?
          </h1>

          <div className="mt-10 flex w-full max-w-sm flex-col gap-3">
            <Button
              type="button"
              onClick={() => navigate({ to: "/author/create" })}
              className="h-14 w-full rounded-2xl bg-[#111111] text-base font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.15)] hover:bg-black"
            >
              <Plus className="mr-2 size-5" />
              Create Game
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate({ to: "/join" })}
              className="h-14 w-full rounded-2xl border-[var(--gamibar-border)] bg-white text-base font-semibold text-[#111111] hover:bg-[var(--gamibar-page)]"
            >
              <ScanLine className="mr-2 size-5" />
              Join Game
            </Button>
          </div>

          <Link
            to="/author/sessions"
            className="mt-8 inline-flex items-center gap-1 text-sm font-semibold text-[#525252] transition-colors hover:text-[#111111]"
          >
            My Games
            <ArrowRight className="size-4" />
          </Link>
        </div>

        <section>
          <div className="text-center sm:text-left">
            <h2 className="font-display text-xl font-bold text-[#111111] sm:text-2xl">
              Choose a game mode
            </h2>
            <p className="mt-1 text-sm text-[#525252]">
              Pick a game, name your session, then add your questions or content.
            </p>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {gameModes.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.button
                  key={item.mode}
                  type="button"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 + i * 0.05 }}
                  onClick={() => openCreateWithMode(item.mode)}
                  className={cn(
                    "group overflow-hidden rounded-[22px] border border-[var(--gamibar-border)] bg-white text-left shadow-[var(--shadow-soft)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]",
                    item.ring,
                  )}
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-[var(--gamibar-page)]">
                    <img
                      src={item.preview}
                      alt=""
                      className="size-full object-contain p-3 transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                    <span
                      className={cn(
                        "absolute left-3 top-3 grid size-9 place-items-center rounded-xl shadow-sm",
                        item.iconTint,
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                  </div>
                  <div className="p-4">
                    <p className="font-display text-base font-bold text-[#111111]">{item.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-[#737373]">{item.copy}</p>
                    <span className="mt-3 inline-flex items-center text-xs font-semibold text-[#111111]">
                      Set up
                      <ArrowRight className="ml-1 size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </section>
      </div>
    </AuthorShell>
  );
}
