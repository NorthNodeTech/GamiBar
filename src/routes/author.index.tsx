import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Blocks, CircleDot, Plus, QrCode, Sparkles, Users, Zap } from "lucide-react";
import { useMemo } from "react";

import { AuthorShell } from "@/components/layout/AuthorShell";
import { RoomJoinShare } from "@/components/session/RoomJoinShare";
import { Button } from "@/components/ui/button";
import gameConnectDotsPreview from "@/assets/game-connect-dots-preview.png";
import gameJigsawPreview from "@/assets/game-jigsaw-preview.webp";
import gameQuizPreview from "@/assets/game-quiz-preview.webp";
import { loadAuthorRoom } from "@/lib/game/client-session";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/author/")({
  head: () => ({
    meta: [
      { title: "Author Portal - GamiBAR" },
      {
        name: "description",
        content: "Create a live classroom game, share the room code or QR, and start when students join.",
      },
    ],
  }),
  component: AuthorHome,
});

const steps = [
  {
    title: "Create a room",
    copy: "Pick Quiz, Jigsaw, or Connect Dots and add your content.",
  },
  {
    title: "Share code or QR",
    copy: "Students scan the QR or enter the 6-digit code to join the lobby.",
  },
  {
    title: "Start when ready",
    copy: "Watch students join, then start the game from your control screen.",
  },
] as const;

const gameModes = [
  {
    mode: "quiz",
    title: "Quiz Challenge",
    copy: "10 multiple-choice questions with a live leaderboard.",
    icon: Zap,
    preview: gameQuizPreview,
    ring: "ring-[var(--game-quiz)]/20 hover:border-[var(--game-quiz)]",
    iconTint: "bg-[var(--game-quiz-soft)] text-[var(--game-quiz)]",
  },
  {
    mode: "jigsaw",
    title: "Jigsaw Mission",
    copy: "Upload an image and let students solve the puzzle.",
    icon: Blocks,
    preview: gameJigsawPreview,
    ring: "ring-[var(--game-jigsaw)]/20 hover:border-[var(--game-jigsaw)]",
    iconTint: "bg-[var(--game-jigsaw-soft)] text-[var(--game-jigsaw)]",
  },
  {
    mode: "connect_dots",
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
  const savedRoom = useMemo(() => loadAuthorRoom(), []);

  return (
    <AuthorShell>
      <div className="mx-auto max-w-5xl space-y-10">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="relative overflow-hidden rounded-[28px] border border-[var(--gamibar-border)] bg-white p-6 shadow-[var(--shadow-lift)] sm:p-10"
        >
          <div
            className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-[var(--gamibar-brand)]/10 blur-3xl"
            aria-hidden
          />
          <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--gamibar-brand)]/20 bg-[var(--gamibar-brand-soft)] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--gamibar-brand)]">
                <Sparkles className="size-3.5" />
                Author portal
              </span>
              <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-[#111111] sm:text-[2.5rem] sm:leading-[1.1]">
                Host a live classroom game in minutes
              </h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-[#525252]">
                Create a room, share the QR code or room code with your class, and start when everyone
                has joined.
              </p>
              <Button
                type="button"
                onClick={() => navigate({ to: "/author/create" })}
                className="mt-7 h-12 rounded-xl bg-[#111111] px-7 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.18)] hover:bg-black"
              >
                <Plus className="mr-2 size-4" />
                Create Session
              </Button>
            </div>

            <div className="rounded-[20px] border border-[var(--gamibar-border)] bg-[var(--gamibar-page)] p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#737373]">How it works</p>
              <ol className="mt-4 space-y-4">
                {steps.map((step, index) => (
                  <li key={step.title} className="flex gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#111111] font-display text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[#111111]">{step.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-[#525252]">{step.copy}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </motion.section>

        {savedRoom && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="space-y-4"
          >
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-bold text-[#111111]">Your active room</h2>
                <p className="mt-1 text-sm text-[#525252]">
                  Continue hosting or share the join link with students.
                </p>
              </div>
              <Button asChild className="h-10 rounded-xl bg-[#111111] hover:bg-black">
                <Link to="/author/room/$roomId" params={{ roomId: savedRoom.roomId }}>
                  Open control screen
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            </div>
            <RoomJoinShare code={savedRoom.code} prominent />
          </motion.section>
        )}

        <section>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-bold text-[#111111]">Choose a game mode</h2>
              <p className="mt-1 text-sm text-[#525252]">All modes use the same create-and-share flow.</p>
            </div>
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
                  onClick={() => navigate({ to: "/author/create" })}
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

        <section className="rounded-[22px] border border-dashed border-[var(--gamibar-border)] bg-white/70 px-5 py-5 backdrop-blur-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--gamibar-brand-soft)] text-[var(--gamibar-brand)]">
              <QrCode className="size-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-[#111111]">Students join from their phones</p>
              <p className="mt-1 text-sm text-[#525252]">
                They use <span className="font-medium text-[#111111]">Join Game</span> in the site header,
                or scan the QR you get right after creating a room.
              </p>
            </div>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-[var(--gamibar-page)] px-3 py-1.5 text-xs font-semibold text-[#525252]">
              <Users className="size-3.5" />
              No student login
            </p>
          </div>
        </section>
      </div>
    </AuthorShell>
  );
}
