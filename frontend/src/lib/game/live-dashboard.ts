import { GAME_CONFIG } from "@/lib/game/config";
import { readPollResponses } from "@/lib/game/polls";
import type { StoredRoom } from "@/lib/game/room-persistence";
import type { LiveParticipantProgress } from "@/lib/game/types";

export function computeLiveParticipantProgress(stored: StoredRoom): LiveParticipantProgress[] {
  const { room, participants, attempts, quizAnswers } = stored;

  return [...participants.values()]
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
    .map((participant) => {
      const attempt = attempts.get(participant.id);
      const answers = quizAnswers.get(participant.id);
      const completed = Boolean(attempt?.completed);

      if (room.mode === "quiz" && room.payload.mode === "quiz") {
        const total = room.payload.questions.length;
        const answered = answers?.size ?? 0;
        const score = attempt?.score ?? (attempt?.correctCount ?? 0) * 100;
        return {
          participantId: participant.id,
          displayName: participant.displayName,
          status: participant.status,
          completed,
          progressText: completed ? "Complete" : `${answered}/${total} answered`,
          score,
          progressPercent: total ? Math.round((answered / total) * 100) : 0,
        };
      }

      if (room.mode === "jigsaw" && room.payload.mode === "jigsaw") {
        const questionTotal = room.payload.questions.length;
        const piecesEarned = attempt?.correctCount ?? 0;
        const payload = attempt?.payload ?? {};
        const lockedCount = typeof payload.lockedCount === "number" ? payload.lockedCount : 0;
        const totalPieces = room.payload.jigsaw.cols * room.payload.jigsaw.rows;
        const progressText = completed
          ? "Complete"
          : piecesEarned < questionTotal
            ? `${piecesEarned}/${questionTotal} pieces earned`
            : `${lockedCount}/${totalPieces} assembled`;
        return {
          participantId: participant.id,
          displayName: participant.displayName,
          status: participant.status,
          completed,
          progressText,
          progressPercent: completed
            ? 100
            : questionTotal
              ? Math.round((piecesEarned / questionTotal) * 100)
              : 0,
        };
      }

      if (room.mode === "connect_dots" && room.payload.mode === "connect_dots") {
        const totalPairs = room.payload.connectDots.pairCount;
        const connected = attempt?.correctCount ?? 0;
        return {
          participantId: participant.id,
          displayName: participant.displayName,
          status: participant.status,
          completed,
          progressText: completed ? "Complete" : `${connected}/${totalPairs} connected`,
          progressPercent: totalPairs ? Math.round((connected / totalPairs) * 100) : 0,
        };
      }

      if (room.mode === "polls" && room.payload.mode === "polls") {
        const total = room.payload.questions.length;
        const answered =
          attempt?.correctCount ?? Object.keys(readPollResponses(attempt?.payload)).length;
        return {
          participantId: participant.id,
          displayName: participant.displayName,
          status: participant.status,
          completed,
          progressText: completed ? "Submitted" : `${answered}/${total} answered`,
          progressPercent: completed ? 100 : total ? Math.round((answered / total) * 100) : 0,
        };
      }

      if (room.mode === "quiz_jigsaw" && room.payload.mode === "quiz_jigsaw") {
        const total = GAME_CONFIG.quiz_jigsaw.questionCount;
        const piecesEarned = attempt?.correctCount ?? 0;
        const score = attempt?.score ?? piecesEarned * 100;
        return {
          participantId: participant.id,
          displayName: participant.displayName,
          status: participant.status,
          completed,
          progressText: completed ? "Complete" : `${piecesEarned}/${total} pieces unlocked`,
          score,
          progressPercent: total ? Math.round((piecesEarned / total) * 100) : 0,
        };
      }

      return {
        participantId: participant.id,
        displayName: participant.displayName,
        status: participant.status,
        completed,
        progressText: "—",
        progressPercent: 0,
      };
    });
}
