Original prompt: complete the new game , add this also with other three option

2026-08-18
- Inspected the pasted Target Hunt spec and the GamiBAR room architecture.
- Existing live modes use `gamibar_rooms.config` for trusted author payloads, `toPublicGamePayload` for student-safe snapshots, `/api/game/*` for answer submission, and `gamibar_attempts` for progress/leaderboard.
- Plan: add `visual_point` as a core live mode, upload Target Hunt images to dedicated Supabase storage, hide `isCorrect`/`adminReference` in student payloads, and validate selected point IDs server-side.
- Implemented Target Hunt authoring, student play, server validation, scoring, persistence, Supabase migration/types, and public/author mode-picker entries.
- Verified `npm.cmd run build`, backend `npm.cmd run check`, HTTP 200 for `http://127.0.0.1:8082/author/create?mode=visual_point`, and a Playwright screenshot of `/games` showing Target Hunt as the fourth game card and footer activity.
