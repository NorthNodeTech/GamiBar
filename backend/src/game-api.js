import "dotenv/config";

import {
  claimAuthorSession,
  createRoom,
  duplicateRoom,
  ensureDemoRoom,
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
  submitQuizAnswer,
  submitQuizJigsawAnswer,
} from "../../frontend/src/lib/game/room-engine.ts";
import {
  deleteAuthorSession,
  fetchAuthorSessionPayload,
  fetchAuthorSessions,
} from "../../frontend/src/lib/supabase/author-sessions.ts";
import {
  getJigsawCategories,
  getJigsawLibraryImages,
  getJigsawSubtopics,
  incrementJigsawLibraryUsage,
} from "../../frontend/src/lib/supabase/jigsaw-library.ts";
import { fetchParticipatedGames } from "../../frontend/src/lib/supabase/participated-games.ts";

import { requireUser } from "./auth.js";
import { HttpError } from "./http-error.js";

const gameActions = {
  "ensure-demo-room": {
    auth: false,
    handler: async () => {
      await ensureDemoRoom();
      return { ok: true };
    },
  },
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
  "submit-quiz-answer": { auth: false, handler: submitQuizAnswer },
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

      const data = req.body ?? {};
      if (action.authUserField) {
        await requireUser(
          req,
          stringValue(data[action.authUserField], action.authUserField),
        );
      } else if (action.auth !== false) {
        await requireUser(req);
      }

      res.json(await action.handler(data));
    }),
  );

  app.get(
    "/api/author-sessions",
    asyncRoute(async (req, res) => {
      const authorId = stringQuery(req.query, "authorId");
      await requireUser(req, authorId);
      res.json(
        await fetchAuthorSessions(authorId, intQuery(req.query, "limit", 50)),
      );
    }),
  );

  app.delete(
    "/api/author-sessions/:roomId",
    asyncRoute(async (req, res) => {
      const authorId = stringValue(req.body?.authorId, "authorId");
      await requireUser(req, authorId);
      await deleteAuthorSession(authorId, req.params.roomId);
      res.json({ ok: true });
    }),
  );

  app.get(
    "/api/author-sessions/:roomId/payload",
    asyncRoute(async (req, res) => {
      const authorId = stringQuery(req.query, "authorId");
      await requireUser(req, authorId);
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

  app.post(
    "/api/jigsaw/usage",
    asyncRoute(async (req, res) => {
      await incrementJigsawLibraryUsage(
        stringValue(req.body?.imageId, "imageId"),
      );
      res.json({ ok: true });
    }),
  );
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
