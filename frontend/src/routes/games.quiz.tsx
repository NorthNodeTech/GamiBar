import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Confetti } from "@/components/games/ui/Confetti";
import { GameShell } from "@/components/games/ui/GameShell";
import { QuestionCard } from "@/components/games/quizes/normal/QuestionCard";
import { quizQuestions } from "@/data/questions";
import { usePlayer } from "@/lib/player-store";
import { createSeoHead, createWebPageJsonLd } from "@/lib/seo";

const quizTitle = "Live Classroom Quiz Game | GamiBar";
const quizDescription =
  "Run a live multiple-choice quiz with instant feedback, streaks, and rankings. Create a GamiBar room and let participants join by code.";

export const Route = createFileRoute("/games/quiz")({
  head: () =>
    createSeoHead({
      title: quizTitle,
      description: quizDescription,
      path: "/games/quiz",
      jsonLd: createWebPageJsonLd({
        title: quizTitle,
        description: quizDescription,
        path: "/games/quiz",
        breadcrumbs: [
          { name: "Home", path: "/" },
          { name: "Tools", path: "/games/" },
          { name: "Quiz Challenge", path: "/games/quiz" },
        ],
      }),
    }),
  component: QuizGame,
});

const TIME = 20;

function QuizGame() {
  const { award, recordAnswers, unlock } = usePlayer();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [xp, setXp] = useState(0);
  const [time, setTime] = useState(TIME);
  const [times, setTimes] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);
  const settled = useRef(false);

  const question = quizQuestions[index]!;

  const settle = useCallback(
    (choice: number | null) => {
      if (locked) return;
      setLocked(true);
      const spent = TIME - time;
      setTimes((t) => [...t, spent]);
      if (choice === question.answer) {
        const gained = 20 + Math.max(0, Math.round((time / TIME) * 15)) + combo * 5;
        setCorrect((c) => c + 1);
        const nextCombo = combo + 1;
        setCombo(nextCombo);
        setBestCombo((best) => Math.max(best, nextCombo));
        setXp((x) => x + gained);
      } else {
        setCombo(0);
      }
    },
    [combo, locked, question.answer, time],
  );

  useEffect(() => {
    if (locked || finished) return;
    if (time <= 0) {
      settle(null);
      return;
    }
    const id = window.setTimeout(() => setTime((t) => t - 1), 1000);
    return () => window.clearTimeout(id);
  }, [time, locked, finished, settle]);

  const next = () => {
    if (index + 1 >= quizQuestions.length) {
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setLocked(false);
    setTime(TIME);
  };

  useEffect(() => {
    if (!finished || settled.current) return;
    settled.current = true;
    const bonus = correct === quizQuestions.length ? 100 : 0;
    award("Quiz Challenge", xp + bonus);
    recordAnswers(correct, quizQuestions.length);
    if (correct === quizQuestions.length) unlock("Perfect Score");
    if (correct >= 8) unlock("Quiz Master");
    toast.success(`Round complete - ${xp + bonus} XP earned`);
  }, [finished, correct, xp, award, recordAnswers, unlock]);

  if (finished) {
    const accuracy = Math.round((correct / quizQuestions.length) * 100);
    const avg = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    const bonus = correct === quizQuestions.length ? 100 : 0;
    return (
      <div className="mx-auto max-w-3xl px-5 py-20">
        <div className="panel relative overflow-hidden p-10 text-center">
          <Confetti />
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Round complete
          </p>
          <h1 className="mt-4 font-display text-5xl font-extrabold">
            <AnimatedNumber value={xp + bonus} /> XP
          </h1>
          <div className="mt-10 grid grid-cols-2 gap-3 text-left md:grid-cols-4">
            <Stat label="Correct" value={`${correct}`} />
            <Stat label="Wrong" value={`${quizQuestions.length - correct}`} />
            <Stat label="Accuracy" value={`${accuracy}%`} />
            <Stat label="Avg. time" value={`${avg.toFixed(1)}s`} />
          </div>
          <p className="mt-5 text-sm text-muted-foreground">Best combo ×{bestCombo}</p>
          <div className="mt-8 flex justify-center gap-3">
            <Button onClick={() => window.location.reload()}>Play again</Button>
            <Button asChild variant="outline">
              <Link to="/dashboard">Go to dashboard</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <GameShell
      title="Quiz Challenge"
      subtitle="Answer fast to keep the combo alive. Explanations appear after every question."
      progress={(index + (locked ? 1 : 0)) / quizQuestions.length}
      progressLabel={`${index + 1} / ${quizQuestions.length}`}
    >
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="panel p-7">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              <QuestionCard
                question={question}
                selected={selected}
                locked={locked}
                index={index}
                total={quizQuestions.length}
                onSelect={(i) => {
                  setSelected(i);
                  settle(i);
                }}
              />
            </motion.div>
          </AnimatePresence>

          {locked && (
            <div className="mt-6 flex justify-end">
              <Button onClick={next}>
                {index + 1 === quizQuestions.length ? "See results" : "Next question"}
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="panel p-6">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Time left</p>
            <p className="mt-2 font-display text-4xl font-bold tabular-nums">{time}s</p>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-elevated">
              <motion.div
                className="h-full origin-left bg-foreground"
                animate={{ scaleX: time / TIME }}
                transition={{ ease: "linear", duration: 0.9 }}
              />
            </div>
          </div>
          <div className="panel grid grid-cols-3 gap-3 p-6">
            <Stat label="Correct" value={`${correct}`} />
            <Stat label="Combo" value={`×${combo}`} />
            <Stat label="XP" value={`${xp}`} />
          </div>
        </div>
      </div>
    </GameShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-elevated/60 px-4 py-3">
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}
