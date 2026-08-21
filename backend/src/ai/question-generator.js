import { HttpError } from "../http-error.js";
import { generateJsonWithAiProviders } from "./providers/index.js";

const QUIZ_OPTION_IDS = ["A", "B", "C", "D"];
const QUIZ_MODES = new Set(["quiz", "quiz_jigsaw", "jigsaw"]);
const MAX_BATCH_SIZE = 10;
const MAX_TOPIC_LENGTH = 180;
const MAX_AUDIENCE_LENGTH = 180;
const MAX_GUIDANCE_LENGTH = 1000;
const MAX_QUESTION_LENGTH = 500;
const MAX_OPTION_LENGTH = 180;
const MAX_AVOID_QUESTIONS = 20;

export async function generateAiQuestion(rawInput) {
  const input = normalizeQuestionRequest(rawInput);
  const { text } = await generateJsonWithAiProviders({
    prompt: buildQuestionPrompt(input),
    schema: questionSchema(),
    schemaName: "gamibar_quiz_question",
  });
  return normalizeQuestionResponse(parseProviderJson(text), input);
}

function normalizeQuestionRequest(rawInput) {
  if (!rawInput || typeof rawInput !== "object") {
    throw new HttpError("Question generation request is invalid.", 400);
  }

  const kind = cleanText(rawInput.kind, 40);
  const mode = cleanText(rawInput.mode, 40);
  const topic = cleanText(rawInput.topic, MAX_TOPIC_LENGTH);
  const audience = cleanText(rawInput.audience, MAX_AUDIENCE_LENGTH);
  const guidance = cleanText(rawInput.guidance, MAX_GUIDANCE_LENGTH);
  const questionNumber = toInteger(rawInput.questionNumber);
  const totalQuestions = toInteger(rawInput.totalQuestions);

  if (kind !== "quiz_question" || !QUIZ_MODES.has(mode)) {
    throw new HttpError("This game mode does not support question generation.", 400);
  }
  if (!topic) throw new HttpError("Enter a topic before generating questions.", 400);
  if (!audience) throw new HttpError("Describe the target audience before generating questions.", 400);
  if (totalQuestions < 1 || totalQuestions > MAX_BATCH_SIZE) {
    throw new HttpError(`Generate between 1 and ${MAX_BATCH_SIZE} questions at a time.`, 400);
  }
  if (questionNumber < 1 || questionNumber > totalQuestions) {
    throw new HttpError("Question progress is invalid.", 400);
  }

  return {
    kind,
    mode,
    topic,
    audience,
    guidance,
    questionNumber,
    totalQuestions,
    avoidQuestions: normalizeAvoidQuestions(rawInput.avoidQuestions),
  };
}

function buildQuestionPrompt(input) {
  return [
    "You are GamiBAR AI, a careful teaching assistant creating classroom-safe quiz content.",
    `Create question ${input.questionNumber} of ${input.totalQuestions}.`,
    "Use the topic, target audience, and optional teacher guidance as binding instructions.",
    "Match vocabulary, assumed knowledge, and difficulty to the target audience. Never use university or engineering-level detail for school learners unless the teacher explicitly requests it.",
    "Return one concise standalone multiple-choice question with exactly four short options.",
    "Exactly one option must be correct. The other three must be plausible but unambiguously wrong.",
    "Avoid trick questions, duplicate options, unsafe content, markdown, explanations, and extra keys.",
    "Do not repeat or closely paraphrase any question in avoidQuestions.",
    `Request JSON:\n${JSON.stringify(input, null, 2)}`,
  ].join("\n");
}

function questionSchema() {
  return {
    type: "object",
    properties: {
      kind: { type: "string", enum: ["quiz_question"] },
      question: { type: "string" },
      options: {
        type: "object",
        properties: Object.fromEntries(QUIZ_OPTION_IDS.map((id) => [id, { type: "string" }])),
        required: QUIZ_OPTION_IDS,
        additionalProperties: false,
      },
      correctOption: { type: "string", enum: QUIZ_OPTION_IDS },
    },
    required: ["kind", "question", "options", "correctOption"],
    additionalProperties: false,
  };
}

function normalizeQuestionResponse(parsed, input) {
  if (!parsed || typeof parsed !== "object") {
    throw new HttpError("AI provider returned an invalid question.", 502);
  }

  const question = cleanText(parsed.question, MAX_QUESTION_LENGTH);
  if (!question) throw new HttpError("AI provider returned an empty question.", 502);
  if (input.avoidQuestions.some((item) => normalizeComparison(item) === normalizeComparison(question))) {
    throw new HttpError("AI provider repeated an existing question. Try generating again.", 502);
  }

  const options = {};
  for (const id of QUIZ_OPTION_IDS) {
    const option = cleanText(parsed.options?.[id], MAX_OPTION_LENGTH);
    if (!option) throw new HttpError("AI provider returned incomplete answer options.", 502);
    options[id] = option;
  }
  if (new Set(Object.values(options).map(normalizeComparison)).size !== QUIZ_OPTION_IDS.length) {
    throw new HttpError("AI provider returned duplicate answer options.", 502);
  }

  const correctOption = normalizeQuizOptionId(parsed.correctOption);
  if (!correctOption) throw new HttpError("AI provider did not identify the correct answer.", 502);

  return { kind: "quiz_question", question, options, correctOption };
}

function normalizeAvoidQuestions(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const result = [];
  for (const item of value) {
    const question = cleanText(item, MAX_QUESTION_LENGTH);
    const key = normalizeComparison(question);
    if (!question || seen.has(key)) continue;
    seen.add(key);
    result.push(question);
    if (result.length === MAX_AVOID_QUESTIONS) break;
  }
  return result;
}

function parseProviderJson(rawText) {
  const text = cleanText(rawText, 12000);
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

function normalizeQuizOptionId(value) {
  const option = cleanText(value, 1).toUpperCase();
  return QUIZ_OPTION_IDS.includes(option) ? option : null;
}

function normalizeComparison(value) {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function cleanText(value, maxLength) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function toInteger(value) {
  return typeof value === "number" && Number.isInteger(value) ? value : 0;
}
