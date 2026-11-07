import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  reviewReasonId,
  type ReviewCatalog,
  type ReviewCase,
  type ReviewJudge,
  type ReviewReflection,
} from "@recourt/types";
import { shareReviewReasons } from "./api-client";

const draftSchema = z.object({
  memo: z.string().max(4_000),
  submission: z
    .object({
      requestId: z.uuid(),
      reasons: z.array(reviewReasonId).min(1).max(3),
      sent: z.boolean(),
    })
    .nullable(),
});

export function useReflectionDraft(key: string) {
  const [memo, setMemo] = useState("");
  const [submission, setSubmission] = useState<z.infer<typeof draftSchema>["submission"]>(null);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState("");
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const draft = draftSchema.parse(JSON.parse(stored));
        setMemo(draft.memo);
        setSubmission(draft.submission);
      }
    } catch {
      setStatus("保存済みのメモを読み込めませんでした。この画面では引き続き書けます。");
    }
    setLoaded(true);
  }, [key]);
  function persist(nextMemo: string, nextSubmission = submission) {
    try {
      localStorage.setItem(key, JSON.stringify({ memo: nextMemo, submission: nextSubmission }));
      return true;
    } catch {
      return false;
    }
  }
  return { memo, setMemo, submission, setSubmission, loaded, status, setStatus, persist };
}

export function useReasonSharing({
  catalog,
  judge,
  courtCase,
  draft,
}: {
  catalog: ReviewCatalog;
  judge: ReviewJudge;
  courtCase: ReviewCase;
  draft: ReturnType<typeof useReflectionDraft>;
}) {
  const [choices, setReasons] = useState<ReviewReflection["reasons"]>([]);
  const reasons = draft.submission?.reasons ?? choices;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  const latestDraft = useRef(draft);
  useEffect(() => {
    latestDraft.current = draft;
  }, [draft]);
  const queryClient = useQueryClient();
  async function share(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || draft.submission?.sent || !draft.loaded || reasons.length === 0) return;
    const next = draft.submission ?? {
      requestId: crypto.randomUUID(),
      reasons: [...reasons],
      sent: false,
    };
    draft.setSubmission(next);
    draft.persist(draft.memo, next);
    busy.current = true;
    setSaving(true);
    setError("");
    try {
      await shareReviewReasons(judge.id, {
        requestId: next.requestId,
        reasons: next.reasons,
        caseId: courtCase.id,
        catalogVersion: catalog.version,
      });
      const sent = { ...next, sent: true };
      draft.setSubmission(sent);
      latestDraft.current.persist(latestDraft.current.memo, sent);
      void queryClient.invalidateQueries({
        queryKey: ["review-reasons", catalog.version, judge.id, courtCase.id],
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "送信できませんでした。同じ内容でもう一度お試しください。",
      );
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  return { reasons, setReasons, saving, error, share };
}
