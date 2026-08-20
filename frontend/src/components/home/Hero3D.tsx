import { Link, useNavigate } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Hash, Loader2 } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";

import homeHeroBg from "@/assets/home-hero-bg.webp";
import { Button } from "@/components/ui/button";
import { HOMEPAGE_HERO } from "@/content/homepage";
import { getRoomSnapshotFn } from "@/lib/game/room.functions";
import { friendlyGameError } from "@/lib/accessibility";
import { normalizeRoomCode } from "@/lib/game/room-code";

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export function Hero3D() {
  const reduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const cleanRoomCode = useMemo(() => normalizeRoomCode(roomCode), [roomCode]);

  const handleJoinSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const clean = normalizeRoomCode(roomCode);

    if (!clean) {
      navigate({ to: "/join" });
      return;
    }

    if (clean.length !== 6) {
      setJoinError("Enter the full 6-digit code.");
      return;
    }

    setLoading(true);
    setJoinError(null);
    try {
      const snap = await getRoomSnapshotFn({ data: { code: clean } });
      if (!snap.ok) {
        setJoinError(
          friendlyGameError(
            snap.error,
            "That room code was not found. Check the code and try again.",
          ),
        );
        return;
      }
      if (snap.room.status === "FINISHED" || snap.room.status === "CANCELLED") {
        setJoinError("This room is closed.");
        return;
      }
      navigate({ to: "/join/name", search: { code: clean } });
    } catch {
      setJoinError("Could not validate room. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative isolate -mt-20 flex min-h-[calc(100dvh+5rem)] h-[calc(100dvh+5rem)] items-center overflow-hidden bg-[#070707] pt-20 pb-8 text-white">
      {/* Background Image */}
      <div className="pointer-events-none absolute inset-0 z-0 select-none">
        <motion.img
          src={homeHeroBg}
          alt=""
          aria-hidden
          className="absolute inset-0 size-full object-cover opacity-100"
          initial={reduceMotion ? false : { scale: 1.06 }}
          animate={reduceMotion ? undefined : { scale: 1 }}
          transition={{ duration: 7, ease: "easeOut" }}
        />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-start px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl text-left drop-shadow-[0_4px_16px_rgba(0,0,0,0.7)]">
          {/* Headline */}
          <motion.h1
            custom={0.04}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="font-display text-[clamp(1.85rem,4.2vw,3.15rem)] font-black leading-[1.08] tracking-tight text-white"
          >
            {HOMEPAGE_HERO.headlinePrefix}
            <span className="mt-1.5 block text-[clamp(1.45rem,3.2vw,2.35rem)] text-[#FF3B30]">
              {HOMEPAGE_HERO.headlineAccent}
            </span>
          </motion.h1>

          {/* Description */}
          <motion.p
            custom={0.12}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="mt-3.5 max-w-lg text-sm sm:text-base leading-relaxed text-zinc-300"
          >
            {HOMEPAGE_HERO.lede}
          </motion.p>

          {/* Direct Room Code Input Form */}
          <motion.div
            custom={0.2}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="mt-5 w-full max-w-md rounded-[20px] border border-white/20 bg-black/40 p-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl"
          >
            <form onSubmit={handleJoinSubmit} className="grid gap-1.5">
              <div className="flex min-h-5 items-center justify-between gap-3 px-1">
                <span className="text-xs font-semibold text-white/90">
                  {HOMEPAGE_HERO.participantPrompt}
                </span>
                {joinError ? (
                  <span className="text-xs font-semibold text-[#FFB4AE]" role="alert">
                    {joinError}
                  </span>
                ) : null}
              </div>

              <div className="flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white p-1.5 text-[#111111]">
                <Hash className="ml-1 size-4 shrink-0 text-[#FF3B30]" aria-hidden />
                <label htmlFor="hero-room-code" className="sr-only">
                  Enter room code
                </label>
                <input
                  id="hero-room-code"
                  value={roomCode}
                  onChange={(event) => {
                    // Only digits allowed, maximum 6
                    const digits = event.target.value.replace(/\D/g, "").slice(0, 6);
                    setRoomCode(digits);
                    if (joinError) setJoinError(null);
                  }}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  maxLength={6}
                  disabled={loading}
                  placeholder={HOMEPAGE_HERO.codePlaceholder}
                  className="min-w-0 flex-1 bg-transparent font-mono text-base font-bold tracking-[0.16em] text-[#111111] outline-none placeholder:font-sans placeholder:font-semibold placeholder:tracking-normal placeholder:text-[#7A7A7A] sm:text-lg"
                />
                <button
                  type="submit"
                  aria-label="Join room"
                  disabled={loading || (cleanRoomCode.length > 0 && cleanRoomCode.length < 6)}
                  className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#FF3B30] text-white transition-colors hover:bg-[#E6332B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ArrowRight className="size-4" />
                  )}
                </button>
              </div>
            </form>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            custom={0.28}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:w-auto"
          >
            <Button
              asChild
              size="lg"
              className="h-11 rounded-full bg-[#FF3B30] px-7 text-xs sm:text-sm font-bold text-white shadow-[0_12px_34px_rgba(255,59,48,0.34)] transition-all duration-200 hover:bg-[#E6332B] hover:shadow-[0_16px_40px_rgba(255,59,48,0.45)] w-full sm:w-auto"
            >
              <Link to="/author/create">
                {HOMEPAGE_HERO.primaryCta}
                <ArrowRight className="ml-2 size-3.5" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-11 rounded-full border-white/20 bg-white/10 px-7 text-xs sm:text-sm font-bold text-white backdrop-blur-md transition-all duration-200 hover:bg-white/20 hover:text-white w-full sm:w-auto"
            >
              <Link to="/join">{HOMEPAGE_HERO.secondaryCta}</Link>
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
