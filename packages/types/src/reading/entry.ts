import { z } from "zod";
import { caseCourtId } from "../api/internal-cases";
import { courtCaseSource } from "../courts/contracts";

export const READING_VERSION = 2;
export const CASE_READING_MODEL = "openai/gpt-5.2";
export const MAX_CASE_PAGES = 100;
export const MAX_CASE_TEXT = 60_000;

export const readingSection = z.enum(["overview", "background", "issue", "reason"]);
export const explanationDepth = z.enum(["short", "standard", "detailed"]);
export const readingTopic = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(30),
  count: z.number().int().nonnegative(),
});
export const readingPassage = z.object({
  id: z.string().regex(/^p\d+-\d+$/),
  page: z.number().int().positive(),
  text: z.string().min(1).max(1_200),
});
export const judgmentText = z
  .object({
    version: z.literal(1),
    pages: z
      .array(z.object({ page: z.number().int().positive(), text: z.string() }))
      .min(1)
      .max(MAX_CASE_PAGES),
    passages: z.array(readingPassage).min(1),
  })
  .superRefine((value, context) => {
    if (value.pages.reduce((total, page) => total + page.text.length, 0) > MAX_CASE_TEXT)
      context.addIssue({ code: "custom", message: "Judgment exceeds text limit" });
    if (value.pages.some((page, index) => page.page !== index + 1))
      context.addIssue({ code: "custom", message: "Pages must be consecutive" });
    for (const page of value.pages) {
      if (
        value.passages
          .filter((passage) => passage.page === page.page)
          .map((passage) => passage.text)
          .join("") !== page.text
      )
        context.addIssue({ code: "custom", message: "Passages must cover the complete page" });
    }
    const ids = new Set<string>();
    for (const passage of value.passages) {
      if (
        ids.has(passage.id) ||
        value.pages[passage.page - 1]?.text.includes(passage.text) !== true
      )
        context.addIssue({ code: "custom", message: "Passage must match its source page" });
      ids.add(passage.id);
    }
  });
export type JudgmentText = z.infer<typeof judgmentText>;

export const preparedJudgment = z
  .object({
    courtCaseId: caseCourtId,
    source: courtCaseSource,
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    processingVersion: z.literal(READING_VERSION),
    pdfKey: z.string().min(1),
    textKey: z.string().min(1).nullable(),
    textSha256: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .nullable(),
    pageCount: z.number().int().nonnegative(),
    status: z.enum(["ready", "held"]),
    holdReason: z.string().nullable(),
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(300),
    topics: z.array(z.string().trim().min(1).max(30)).max(8),
  })
  .refine(
    (input) =>
      input.status !== "ready" ||
      (input.textKey !== null &&
        input.textSha256 !== null &&
        input.topics.length > 0 &&
        input.holdReason === null),
    { message: "Ready document must have text and topics" },
  );
export type PreparedJudgment = z.infer<typeof preparedJudgment>;

export const readingCase = z.object({
  id: z.uuid(),
  documentId: z.uuid(),
  title: z.string(),
  description: z.string(),
  courtName: z.string(),
  caseNumber: z.string(),
  decisionDate: z.string().nullable(),
  detailUrl: z.url(),
  topics: z.array(z.object({ id: z.string(), label: z.string() })),
  pageCount: z.number().int().positive(),
});
export type ReadingCase = z.infer<typeof readingCase>;
export const caseListResult = z.object({
  cases: z.array(readingCase),
  total: z.number().int().nonnegative(),
  offset: z.number().int().nonnegative(),
  limit: z.literal(20),
});
export const caseDocument = z.object({ case: readingCase, text: judgmentText });

export const generatedParagraph = z
  .object({
    kind: z.enum(["judgment", "explanation", "unavailable"]),
    text: z.string().trim().min(1).max(4_000),
    passageIds: z.array(z.string()).max(5),
  })
  .refine((value) => value.kind !== "judgment" || value.passageIds.length > 0, {
    message: "Judgment claims require evidence",
  });
export const sourceCitation = z.object({
  documentId: z.uuid(),
  passageId: z.string(),
  page: z.number().int().positive(),
  excerpt: z.string(),
  pdfUrl: z.string(),
});
export const readingParagraph = z.object({
  kind: generatedParagraph.shape.kind,
  text: z.string(),
  citations: z.array(sourceCitation),
});
export type ReadingParagraph = z.infer<typeof readingParagraph>;
export const caseReadingEvent = z.discriminatedUnion("event", [
  z.object({ event: z.literal("paragraph"), data: readingParagraph }),
  z.object({ event: z.literal("done"), data: z.object({}) }),
  z.object({
    event: z.literal("error"),
    data: z.object({ code: z.string(), message: z.string() }),
  }),
]);
export type CaseReadingEvent = z.infer<typeof caseReadingEvent>;
export const caseExplainBody = z.strictObject({
  documentId: z.uuid(),
  section: readingSection,
  depth: explanationDepth,
});
export const caseChatBody = caseExplainBody
  .extend({
    messages: z
      .array(
        z.strictObject({
          role: z.enum(["user", "assistant"]),
          content: z.string().trim().min(1).max(4_000),
        }),
      )
      .min(1)
      .max(20),
  })
  .refine(
    ({ messages }) =>
      messages.every(
        (message, index) => message.role === (index % 2 === 0 ? "user" : "assistant"),
      ) && messages.at(-1)?.role === "user",
    { message: "Conversation must alternate and end with user" },
  );

const aliases: Record<string, string> = {
  同性結婚: "同性婚",
  婚姻: "結婚",
  婚姻制度: "結婚",
  憲法上の平等: "平等",
  刑の重さ: "量刑",
};
export function normalizeTopic(label: string): string {
  const normalized = label
    .normalize("NFKC")
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, "")
    .trim();
  return aliases[normalized] ?? normalized;
}

export const heldJudgmentSource = z.object({
  courtCaseId: caseCourtId,
  source: courtCaseSource,
  pdfUrl: z.url(),
  reason: z.enum(["PDF_TOO_LARGE", "MULTIPLE_PDFS"]),
});

export function readingTopicLabels(labels: string[]): string[] {
  const topics = new Set(labels.map(normalizeTopic).filter(Boolean));
  const marriageTopics = [
    "同性婚",
    "婚姻費用",
    "婚姻関係の破綻",
    "夫婦の別居",
    "夫婦別姓",
    "離婚",
    "配偶者同意",
    "既婚者の身分詐称",
  ];
  if (marriageTopics.some((topic) => topics.has(topic))) topics.add("結婚");
  return [...topics];
}
