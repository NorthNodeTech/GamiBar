import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Confetti } from "@/components/games/Confetti";
import { GameShell } from "@/components/games/GameShell";
import { JigsawBoard, TOTAL_PIECES } from "@/components/games/JigsawBoard";
import { QuestionCard } from "@/components/games/QuestionCard";
import { quizQuestions } from "@/data/questions";
import { usePlayer } from "@/lib/player-store";
import { createSeoHead, createWebPageJsonLd } from "@/lib/seo";

const jigsawTitle = "Jigsaw Classroom Game | GamiBar";
const jigsawDescription =
  "Turn a classroom image into a live timed jigsaw mission. Students answer, reconstruct the visual puzzle, and compare results in GamiBar.";

export const Route = createFileRoute("/games/jigsaw")({
  head: () =>
    createSeoHead({
      title: jigsawTitle,
      description: jigsawDescription,
      path: "/games/jigsaw",
      jsonLd: createWebPageJsonLd({
        title: jigsawTitle,
        description: jigsawDescription,
        path: "/games/jigsaw",
        breadcrumbs: [
          { name: "Home", path: "/" },
          { name: "Game Modes", path: "/games/" },
          { name: "Jigsaw Mission", path: "/games/jigsaw" },
        ],
      }),
    }),
  component: JigsawGame,
});

function JigsawGame() {
  const { award, recordAnswers, unlock } = usePlayer();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [revealed, setRevealed] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [imageSrc, setImageSrc] = useState<string | undefined>(undefined);
  const settled = useRef(false);

  const question = quizQuestions[index]!;
  const complete = revealed >= TOTAL_PIECES;

  useEffect(() => {
    if (!complete || settled.current) return;
    settled.current = true;
    const xp = 250 + correct * 20;
    award("Jigsaw Mission", xp);
    recordAnswers(correct, quizQuestions.length);
    unlock("Puzzle Champion");
    toast.success(`Mission complete - ${xp} XP earned`);
  }, [complete, correct, award, recordAnswers, unlock]);

  const answer = (i: number) => {
    if (locked) return;
    setSelected(i);
    setLocked(true);
    if (i === question.answer) {
      setCorrect((c) => c + 1);
      setRevealed((r) => Math.min(TOTAL_PIECES, r + 1));
    }
  };

  const next = () => {
    setIndex((i) => (i + 1) % quizQuestions.length);
    setSelected(null);
    setLocked(false);
  };

  const onUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    setImageSrc(url);
  };

  return (
    <GameShell
      title="Jigsaw Mission"
      subtitle="Each correct answer releases one puzzle piece. Complete the image to finish the mission."
      progress={revealed / TOTAL_PIECES}
      progressLabel={`${revealed} / ${TOTAL_PIECES} Pieces`}
    >
      <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        <div className="panel relative overflow-hidden p-6">
          <JigsawBoard revealed={revealed} {...(imageSrc ? { imageSrc } : {})} />
          <AnimatePresence>
            {complete && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 grid place-items-center bg-background/80 backdrop-blur-sm"
              >
                <Confetti />
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 180, damping: 18 }}
                  className="text-center"
                >
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    Mission complete
                  </p>
                  <h2 className="mt-3 font-display text-3xl font-extrabold">
                    +{250 + correct * 20} XP
                  </h2>
                  <div className="mt-6 flex justify-center gap-3">
                    <Button onClick={() => window.location.reload()}>Play again</Button>
                    <Button asChild variant="outline">
                      <Link to="/games">All games</Link>
                    </Button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-6 flex items-center justify-between border-t border-border pt-5">
            <p className="text-xs text-muted-foreground">
              Swap the puzzle image - logic stays identical.
            </p>
            <label className="cursor-pointer rounded-md border border-border px-3 py-1.5 text-xs transition-colors hover:bg-secondary">
              Upload image
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUpload(f);
                }}
              />
            </label>
          </div>
        </div>

        <div className="panel p-7">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.3 }}
            >
              <QuestionCard
                question={question}
                selected={selected}
                locked={locked}
                index={index}
                total={quizQuestions.length}
                onSelect={answer}
              />
            </motion.div>
          </AnimatePresence>
          {locked && !complete && (
            <div className="mt-6 flex justify-end">
              <Button onClick={next}>Next question</Button>
            </div>
          )}
        </div>
      </div>
    </GameShell>
  );
}
