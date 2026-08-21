import "./load-env.js";

import {
  claimAuthorSession,
  createRoom,
  duplicateRoom,
  expireQuestionTimer,
  getAuthorRoomResults,
  getRoomSnapshot,
  joinRoom,
  reconnectParticipant,
  recordConnectDotsIncorrectAttempt,
  rotateJigsawMissionTile,
  setShowLeaderboardToStudents,
  startGame,
  stopGame,
  submitConnectDotsMatches,
  submitConnectDotsPaths,
  submitJigsawMissionAnswer,
  submitJigsawMissionAssembly,
  submitJigsawProgress,
  submitPollResponses,
  submitPollQuestionResponse,
  submitQuizAnswer,
  submitQuizJigsawAnswer,
  submitVisualPointAnswer,
} from "./game/room-engine.ts";
import {
  deleteAuthorSession,
  fetchAuthorSessionPayload,
  fetchAuthorSessions,
} from "./game/author-sessions.ts";
import {
  getJigsawCategories,
  getJigsawLibraryImages,
  getJigsawSubtopics,
} from "./game/jigsaw-library.ts";
import { fetchParticipatedGames } from "./game/participated-games.ts";

import { optionalUser, requireAuthor, requireUser } from "./auth.js";
import { getAuthorPlanLimits } from "./billing/service.js";
import { HttpError } from "./http-error.js";
import {
  queueRealtimeSignal,
  roomHostTopic,
  roomPublicTopic,
} from "./realtime.js";

const PUBLIC_ROOM_ACTIONS = new Set([
  "join-room",
  "reconnect-participant",
  "start-game",
  "stop-game",
  "set-student-leaderboard",
]);

const HOST_ROOM_ACTIONS = new Set([
  ...PUBLIC_ROOM_ACTIONS,
  "submit-poll-responses",
  "submit-poll-question-response",
  "expire-question-timer",
  "submit-quiz-answer",
  "submit-visual-point-answer",
  "submit-quiz-jigsaw-answer",
  "submit-jigsaw-mission-answer",
  "rotate-jigsaw-mission-tile",
  "submit-jigsaw-progress",
  "submit-jigsaw-mission-assembly",
  "submit-connect-dots-matches",
  "submit-connect-dots-paths",
  "record-connect-dots-incorrect-attempt",
]);

const gameActions = {
  "create-room": { authUserField: "authorId", handler: createRoom },
  "join-room": { auth: false, handler: joinRoom },
  "reconnect-participant": { auth: false, handler: reconnectParticipant },
  "room-snapshot": { auth: false, handler: getRoomSnapshot },
  "author-room-results": {
    authUserField: "authorId",
    handler: getAuthorRoomResults,
  },
  "duplicate-room": { authUserField: "authorId", handler: duplicateRoom },
  "claim-author-session": {
    authUserField: "authorId",
    handler: claimAuthorSession,
  },
  "start-game": { auth: false, handler: startGame },
  "stop-game": { auth: false, handler: stopGame },
  "set-student-leaderboard": {
    auth: false,
    handler: setShowLeaderboardToStudents,
  },
  "submit-poll-responses": { auth: false, handler: submitPollResponses },
  "submit-poll-question-response": {
    auth: false,
    handler: submitPollQuestionResponse,
  },
  "expire-question-timer": { auth: false, handler: expireQuestionTimer },
  "submit-quiz-answer": { auth: false, handler: submitQuizAnswer },
  "submit-visual-point-answer": {
    auth: false,
    handler: submitVisualPointAnswer,
  },
  "submit-quiz-jigsaw-answer": { auth: false, handler: submitQuizJigsawAnswer },
  "submit-jigsaw-mission-answer": {
    auth: false,
    handler: submitJigsawMissionAnswer,
  },
  "rotate-jigsaw-mission-tile": {
    auth: false,
    handler: rotateJigsawMissionTile,
  },
  "submit-jigsaw-progress": { auth: false, handler: submitJigsawProgress },
  "submit-jigsaw-mission-assembly": {
    auth: false,
    handler: submitJigsawMissionAssembly,
  },
  "submit-connect-dots-matches": {
    auth: false,
    handler: submitConnectDotsMatches,
  },
  "submit-connect-dots-paths": { auth: false, handler: submitConnectDotsPaths },
  "record-connect-dots-incorrect-attempt": {
    auth: false,
    handler: recordConnectDotsIncorrectAttempt,
  },
};

export function registerGameRoutes(app) {
  app.post(
    "/api/game/:action",
    asyncRoute(async (req, res) => {
      const action = gameActions[req.params.action];
      if (!action) throw new HttpError("Unknown game action.", 404);

      let data = req.body ?? {};
      if (req.params.action === "join-room") {
        const user = await optionalUser(req);
        data = { ...data, userId: user?.id ?? null };
      } else if (action.authUserField) {
        const user = await requireAuthor(
          req,
          stringValue(data[action.authUserField], action.authUserField),
        );
        if (
          req.params.action === "create-room" ||
          req.params.action === "duplicate-room"
        ) {
          const limits = await getAuthorPlanLimits(user.id);
          data = {
            ...data,
            maxParticipants: limits.livePlayersPerRoom,
            roomLifespanDays: limits.roomLifespanDays,
          };
        }
      } else if (action.auth !== false) {
        await requireUser(req);
      }

      const result = await action.handler(data);
      const roomId = resolveRoomId(data, result);
      if (roomId) {
        if (HOST_ROOM_ACTIONS.has(req.params.action)) {
          queueRealtimeSignal(
            roomHostTopic(roomId),
            "room_changed",
            { action: req.params.action },
            100,
          );
        }
        if (PUBLIC_ROOM_ACTIONS.has(req.params.action)) {
          queueRealtimeSignal(
            roomPublicTopic(roomId),
            "room_changed",
            { action: req.params.action },
            250,
          );
        }
      }
      res.json(result);
    }),
  );

  app.get(
    "/api/author-sessions",
    asyncRoute(async (req, res) => {
      const authorId = stringQuery(req.query, "authorId");
      await requireAuthor(req, authorId);
      res.json(
        await fetchAuthorSessions(authorId, intQuery(req.query, "limit", 50)),
      );
    }),
  );

  app.delete(
    "/api/author-sessions/:roomId",
    asyncRoute(async (req, res) => {
      const authorId = stringValue(req.body?.authorId, "authorId");
      await requireAuthor(req, authorId);
      await deleteAuthorSession(authorId, req.params.roomId);
      res.json({ ok: true });
    }),
  );

  app.get(
    "/api/author-sessions/:roomId/payload",
    asyncRoute(async (req, res) => {
      const authorId = stringQuery(req.query, "authorId");
      await requireAuthor(req, authorId);
      res.json(await fetchAuthorSessionPayload(authorId, req.params.roomId));
    }),
  );

  app.get(
    "/api/participated-games",
    asyncRoute(async (req, res) => {
      const userId = stringQuery(req.query, "userId");
      await requireUser(req, userId);
      res.json(
        await fetchParticipatedGames(userId, intQuery(req.query, "limit", 50)),
      );
    }),
  );

  app.get(
    "/api/jigsaw/categories",
    asyncRoute(async (_req, res) => {
      res.json(await getJigsawCategories());
    }),
  );

  app.get(
    "/api/jigsaw/subtopics",
    asyncRoute(async (req, res) => {
      res.json(await getJigsawSubtopics(stringQuery(req.query, "categoryId")));
    }),
  );

  app.get(
    "/api/jigsaw/images",
    asyncRoute(async (req, res) => {
      res.json(
        await getJigsawLibraryImages({
          categoryId: optionalString(req.query.categoryId),
          subtopicId: optionalString(req.query.subtopicId),
          search: optionalString(req.query.search),
          sort: optionalSort(req.query.sort),
          offset: intQuery(req.query, "offset", 0),
          limit: intQuery(req.query, "limit", undefined),
        }),
      );
    }),
  );

}

function resolveRoomId(data, result) {
  if (typeof data?.roomId === "string" && data.roomId) return data.roomId;
  if (typeof result?.room?.id === "string" && result.room.id)
    return result.room.id;
  return null;
}

function stringValue(value, key) {
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpError(`${key} is required.`, 400);
  }
  return value;
}

function stringQuery(query, key) {
  return stringValue(query?.[key], key);
}

function optionalString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function optionalSort(value) {
  return value === "recent" || value === "popular" ? value : undefined;
}

function intQuery(query, key, fallback) {
  const raw = query?.[key];
  if (raw == null || raw === "") return fallback;
  const value = Number.parseInt(String(raw), 10);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function asyncRoute(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
