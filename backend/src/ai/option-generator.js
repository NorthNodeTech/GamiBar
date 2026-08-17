import { HttpError } from "../http-error.js";
import { generateJsonWithAiProviders } from "./providers/index.js";

const QUIZ_OPTION_IDS = ["A", "B", "C", "D"];
const QUIZ_MODES = new Set(["quiz", "quiz_jigsaw", "jigsaw"]);
const POLL_CHOICE_TYPES = new Set(["single_choice", "multiple_choice"]);
const MAX_QUESTION_LENGTH = 800;
const MAX_TEXT_LENGTH = 180;
const MAX_CONTEXT_TEXT_LENGTH = 120;

export async function generateAiOptions(rawInput) {
  const input = normalizeRequest(rawInput);
  const { prompt, schema, schemaName } = buildGenerationRequest(input);
  const { text } = await generateJsonWithAiProviders({ prompt, schema, schemaName });
  const parsed = parseProviderJson(text);
  return normalizeProviderResponse(input, parsed);
}

function normalizeRequest(rawInput) {
  if (!rawInput || typeof rawInput !== "object") {
    throw new HttpError("Generation request is invalid.", 400);
  }

  const kind = cleanText(rawInput.kind, 40);
  const mode = cleanText(rawInput.mode, 40);
  const question = cleanText(rawInput.question, MAX_QUESTION_LENGTH);
  if (!question) {
    throw new HttpError("Enter a question before generating.", 400);
  }

  const context = normalizeContext(rawInput.context);

  if (kind === "quiz_options") {
    if (!QUIZ_MODES.has(mode)) {
      throw new HttpError("This game mode does not support quiz option generation.", 400);
    }

    return {
      kind,
      mode,
      question,
      context: {
        ...context,
        existingOptions: normalizeExistingOptions(rawInput.context?.existingOptions),
        correctOption: normalizeQuizOptionId(rawInput.context?.correctOption),
      },
    };
  }

  if (kind === "poll_options") {
    const pollType = cleanText(rawInput.pollType, 40);
    if (mode !== "polls" || !POLL_CHOICE_TYPES.has(pollType)) {
      throw new HttpError("Only choice polls can generate options.", 400);
    }

    return {
      kind,
      mode,
      pollType,
      question,
      context: {
        ...context,
        existingOptions: normalizeStringArray(rawInput.context?.existingOptions, 10),
      },
    };
  }

  if (kind === "connect_dots_answer") {
    if (mode !== "connect_dots") {
      throw new HttpError("This game mode does not support Connect Dots answer generation.", 400);
    }

    return {
      kind,
      mode,
      question,
      context: {
        ...context,
        existingAnswer: cleanText(rawInput.context?.existingAnswer, MAX_TEXT_LENGTH),
      },
    };
  }

  throw new HttpError("Unknown generation kind.", 400);
}

function normalizeContext(rawContext) {
  const context = rawContext && typeof rawContext === "object" ? rawContext : {};
  return {
    roomName: cleanText(context.roomName, MAX_CONTEXT_TEXT_LENGTH),
    subject: cleanText(context.subject, MAX_CONTEXT_TEXT_LENGTH),
    modeLabel: cleanText(context.modeLabel, MAX_CONTEXT_TEXT_LENGTH),
  };
}

function buildGenerationRequest(input) {
  const baseInstructions = [
    "You help teachers create concise, classroom-safe game content.",
    "Use the question and context exactly as guidance.",
    "Do not add explanations, markdown, code fences, or extra keys.",
    "Avoid duplicate answers. Keep each generated item under 90 characters.",
    "If the prompt is ambiguous, make the most likely educational interpretation and keep the answer reviewable.",
  ];

  if (input.kind === "quiz_options") {
    return {
      schemaName: "gamibar_quiz_options",
      schema: quizSchema(),
      prompt: [
        ...baseInstructions,
        "Generate four multiple-choice answer options.",
        "Exactly one option must be correct, and correctOption must be the letter for that answer.",
        "Distractors should be plausible but clearly wrong.",
        requestJson(input),
      ].join("\n"),
    };
  }

  if (input.kind === "poll_options") {
    return {
      schemaName: "gamibar_poll_options",
      schema: pollSchema(),
      prompt: [
        ...baseInstructions,
        "Generate 4 to 6 balanced poll choices for the question.",
        "Poll choices do not have a correct answer.",
        "Use neutral wording suitable for survey results.",
        requestJson(input),
      ].join("\n"),
    };
  }

  return {
    schemaName: "gamibar_connect_dots_answer",
    schema: connectDotsSchema(),
    prompt: [
      ...baseInstructions,
      "Generate one short matching answer for a Connect Dots pair.",
      "The answer should match the question directly and fit on a compact game tile.",
      requestJson(input),
    ].join("\n"),
  };
}

function requestJson(input) {
  return `Request JSON:\n${JSON.stringify(input, null, 2)}`;
}

function quizSchema() {
  return {
    type: "object",
    properties: {
      kind: { type: "string", enum: ["quiz_options"] },
      options: {
        type: "object",
        properties: Object.fromEntries(QUIZ_OPTION_IDS.map((id) => [id, { type: "string" }])),
        required: QUIZ_OPTION_IDS,
        additionalProperties: false,
      },
      correctOption: { type: "string", enum: QUIZ_OPTION_IDS },
    },
    required: ["kind", "options", "correctOption"],
    additionalProperties: false,
  };
}

function pollSchema() {
  return {
    type: "object",
    properties: {
      kind: { type: "string", enum: ["poll_options"] },
      options: {
        type: "array",
        minItems: 2,
        maxItems: 10,
        items: { type: "string" },
      },
    },
    required: ["kind", "options"],
    additionalProperties: false,
  };
}

function connectDotsSchema() {
  return {
    type: "object",
    properties: {
      kind: { type: "string", enum: ["connect_dots_answer"] },
      answer: { type: "string" },
    },
    required: ["kind", "answer"],
    additionalProperties: false,
  };
}

function parseProviderJson(rawText) {
  const text = cleanText(rawText, 10000);
  if (!text) throw new HttpError("AI provider returned an empty response.", 502);

  try {
    return JSON.parse(text);
  } catch {
    const match = /\{[\s\S]*\}/.exec(text);
    if (!match) throw new HttpError("AI provider returned an invalid response.", 502);
    try {
      return JSON.parse(match[0]);
    } catch {
      throw new HttpError("AI provider returned an invalid response.", 502);
    }
  }
}

function normalizeProviderResponse(input, parsed) {
  if (!parsed || typeof parsed !== "object") {
    throw new HttpError("AI provider returned an invalid response.", 502);
  }

  if (input.kind === "quiz_options") {
    const options = {};
    for (const id of QUIZ_OPTION_IDS) {
      const value = cleanText(parsed.options?.[id], MAX_TEXT_LENGTH);
      if (!value) throw new HttpError("AI provider returned incomplete options.", 502);
      options[id] = value;
    }

    const correctOption = normalizeQuizOptionId(parsed.correctOption);
    if (!correctOption) throw new HttpError("AI provider did not choose a correct answer.", 502);
    ensureDistinct(Object.values(options));
    return { kind: "quiz_options", options, correctOption };
  }

  if (input.kind === "poll_options") {
    const options = uniqueStrings(normalizeStringArray(parsed.options, 10)).slice(0, 10);
    if (options.length < 2) throw new HttpError("AI provider returned too few poll options.", 502);
    return { kind: "poll_options", options };
  }

  const answer = cleanText(parsed.answer, MAX_TEXT_LENGTH);
  if (!answer) throw new HttpError("AI provider returned an empty answer.", 502);
  return { kind: "connect_dots_answer", answer };
}

function normalizeExistingOptions(options) {
  const normalized = {};
  if (!options || typeof options !== "object") return normalized;
  for (const id of QUIZ_OPTION_IDS) {
    normalized[id] = cleanText(options[id], MAX_TEXT_LENGTH);
  }
  return normalized;
}

function normalizeQuizOptionId(value) {
  const text = cleanText(value, 1).toUpperCase();
  return QUIZ_OPTION_IDS.includes(text) ? text : null;
}

function normalizeStringArray(value, maxItems) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => cleanText(item, MAX_TEXT_LENGTH))
    .filter(Boolean)
    .slice(0, maxItems);
}

function uniqueStrings(values) {
  const seen = new Set();
  return values.filter((value) => {
    const key = value.toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function ensureDistinct(values) {
  if (uniqueStrings(values).length !== values.length) {
    throw new HttpError("AI provider returned duplicate options.", 502);
  }
}

function cleanText(value, maxLength) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}
