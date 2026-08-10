import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Flame, Timer, XCircle } from "lucide-react";

import { Card3DTilt } from "./Card3DTilt";
import { sound } from "@/lib/sound";

export function QuizShowcaseCard() {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [streak, setStreak] = useState(3);
  const [currentQ, setCurrentQ] = useState(0);

  const questions = [
    {
      text: "Which data structure uses LIFO?",
      options: ["Queue", "Stack", "Tree", "List"],
      correct: 1,
    },
    {
      text: "Time complexity of binary search?",
      options: ["O(n)", "O(n²)", "O(log n)", "O(1)"],
      correct: 2,
    },
  ];

  const q = questions[currentQ];

  const handleSelect = (idx: number) => {
    if (selectedIdx !== null) return;
    setSelectedIdx(idx);
    if (idx === q.correct) {
      setIsCorrect(true);
      setStreak((s) => s + 1);
      sound.playXp();
    } else {
      setIsCorrect(false);
      setStreak(0);
      sound.playSnap();
    }
    setTimeout(() => {
      setSelectedIdx(null);
      setIsCorrect(null);
      setCurrentQ((prev) => (prev + 1) % questions.length);
    }, 1800);
  };

  return (
    <Card3DTilt variant="dark" cursorType="quiz" className="flex h-full min-h-[220px] flex-col p-4 md:p-5 lg:min-h-[260px] lg:p-6 xl:min-h-[300px]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-amber-400 lg:size-10">
            <Timer className="size-4 lg:size-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white lg:text-base">Quiz Challenge</h3>
            <p className="text-[11px] text-zinc-400 lg:text-xs">Real-Time Demo</p>
          </div>
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-full border border-orange-400/30 bg-orange-400/10 px-2 py-0.5 text-[11px] font-bold text-orange-300 lg:text-xs">
          <Flame className="size-3" /> {streak} Streak
        </span>
      </div>

      <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 lg:mt-4 lg:p-4">
        <div className="flex items-center justify-between text-[10px] text-zinc-500 lg:text-xs">
          <span>Q{currentQ + 1}/{questions.length}</span>
          <span className="font-semibold text-emerald-400">+100 XP</span>
        </div>
        <p className="mt-1.5 text-xs font-medium leading-snug text-white lg:text-sm">{q.text}</p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-1.5 lg:gap-2">
        {q.options.map((opt, idx) => {
          let stateStyle = "border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.07]";
          if (selectedIdx !== null) {
            if (idx === q.correct) stateStyle = "border-emerald-500/60 bg-emerald-500/10 text-emerald-300";
            else if (idx === selectedIdx) stateStyle = "border-[#737373]/60 bg-[#737373]/10 text-zinc-300";
          }
          return (
            <button
              key={opt}
              onClick={() => handleSelect(idx)}
              disabled={selectedIdx !== null}
              className={`flex items-center justify-between rounded-lg border px-2.5 py-2 text-[11px] lg:px-3 lg:py-2.5 lg:text-xs ${stateStyle}`}
            >
              <span className="truncate">{opt}</span>
              {selectedIdx !== null && idx === q.correct && <CheckCircle2 className="size-3.5 shrink-0 text-emerald-400" />}
              {selectedIdx === idx && idx !== q.correct && <XCircle className="size-3.5 shrink-0 text-zinc-400" />}
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {isCorrect !== null && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`mt-2 text-center text-[11px] font-semibold lg:text-xs ${isCorrect ? "text-emerald-400" : "text-zinc-400"}`}
          >
            {isCorrect ? "Correct!" : "Try again"}
          </motion.p>
        )}
      </AnimatePresence>

      <div className="mt-auto pt-3 lg:pt-4">
        <Link
          to="/login"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#111111] px-4 py-2.5 text-xs font-bold text-white hover:bg-black lg:py-3 lg:text-sm"
        >
          Play Quiz Challenge
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </Card3DTilt>
  );
}
