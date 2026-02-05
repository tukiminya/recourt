import { google } from "@ai-sdk/google";
import { NoObjectGeneratedError, Output, generateText } from "ai";

import { putR2Object } from "@recourt/core";

import type { IngestConfig } from "../load-config.js";
import { structuredOutputSchema } from "../schema.js";

export const GEMINI_MODEL = google("gemini-3-flash-preview");

export type AiMetadata = {
  decision_date: string;
  court_incident_id: string;
  court_name: string | null;
};

export const buildAiRequestPayload = (input: {
  prompt: string;
  metadata: AiMetadata;
  pdfBytes: Uint8Array;
  model: string;
}) => {
  return {
    model: input.model,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: input.prompt },
          {
            type: "file",
            data: Buffer.from(input.pdfBytes).toString("base64"),
            mimeType: "application/pdf",
          },
          { type: "text", text: JSON.stringify(input.metadata) },
        ],
      },
    ],
  };
};

export const storeAiRequest = async (
  r2Client: ReturnType<typeof import("@recourt/core").createR2Client>,
  bucket: string,
  key: string,
  payload: unknown,
) => {
  await putR2Object(r2Client, bucket, key, JSON.stringify(payload), "application/json");
};

export const storeAiResponse = async (
  r2Client: ReturnType<typeof import("@recourt/core").createR2Client>,
  bucket: string,
  key: string,
  payload: unknown,
) => {
  await putR2Object(r2Client, bucket, key, JSON.stringify(payload), "application/json");
};

export const storeAiOutput = async (
  r2Client: ReturnType<typeof import("@recourt/core").createR2Client>,
  bucket: string,
  key: string,
  payload: unknown,
) => {
  await putR2Object(r2Client, bucket, key, JSON.stringify(payload), "application/json");
};

export const callGemini = async (input: {
  config: IngestConfig;
  pdfBytes: Uint8Array;
  metadata: AiMetadata;
}) => {
  try {
    return generateText({
      model: GEMINI_MODEL,
      output: Output.object({
        schema: structuredOutputSchema,
      }),
      providerOptions: {
        google: {
          structuredOutputSchema: true,
        },
      },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: input.config.gemini.prompt },
            {
              type: "file",
              data: input.pdfBytes,
              mediaType: "application/pdf",
            },
            { type: "text", text: JSON.stringify(input.metadata) },
          ],
        },
      ],
    });
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      console.log("NoObjectGeneratedError");
      console.log("Cause:", error.cause);
      console.log("Text:", error.text);
      console.log("Response:", error.response);
      console.log("Usage:", error.usage);
      console.log("Finish Reason:", error.finishReason);
    }
  }
};
