/**
 * Shared live-session pipelines for teacher and student flows.
 * UI routes map to these steps — see comments for wiring.
 */

/** Primary live game modes supported by the unified architecture. */
export const CORE_LIVE_GAME_MODES = ["quiz", "jigsaw", "connect_dots"] as const;

export type CoreLiveGameMode = (typeof CORE_LIVE_GAME_MODES)[number];

export const TEACHER_FLOW = [
  { id: "create", wizardStep: "details" as const, label: "Create Game" },
  { id: "select_mode", wizardStep: "mode" as const, label: "Select Game Mode" },
  { id: "configure", wizardStep: "configure" as const, label: "Configure Game" },
  /** Quiz modes embed questions inside the configure step (no separate wizard screen). */
  { id: "add_questions", wizardStep: "configure" as const, label: "Add Questions" },
  { id: "save", wizardStep: "review" as const, label: "Save" },
  { id: "generate_code", wizardStep: "review" as const, label: "Generate Game Code" },
  /** After createRoom — author.room.$roomId */
  { id: "start", wizardStep: null, label: "Start Game", route: "/author/room/$roomId" },
] as const;

export const STUDENT_FLOW = [
  { id: "join_code", route: "/join", label: "Join with Code" },
  { id: "enter_name", route: "/join/name", label: "Enter Name" },
  { id: "lobby", route: "/join/lobby", label: "Lobby" },
  { id: "wait_for_teacher", route: "/join/lobby", label: "Wait for Teacher" },
  { id: "play", route: "/play/$roomId", label: "Play" },
  { id: "submit", route: "/play/$roomId", label: "Submit" },
  { id: "result", route: "/play/$roomId", label: "Result" },
] as const;

export type TeacherFlowStepId = (typeof TEACHER_FLOW)[number]["id"];
export type StudentFlowStepId = (typeof STUDENT_FLOW)[number]["id"];
