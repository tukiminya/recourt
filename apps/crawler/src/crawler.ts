import { createUuidV7 } from "@scpv/core";
import {
  type NewCase,
  type NewCrawlRange,
  type NewIngestJob,
  type NewOutcome,
  cases,
  court_incidents,
  crawl_ranges,
  createDatabase,
  incident_categories,
  ingest_jobs,
  outcomes,
  runMigrations,
} from "@scpv/database";
import type { CheerioAPI } from "crawlee";
import { CheerioCrawler, RequestQueue } from "crawlee";
import { and, eq } from "drizzle-orm";

import dayjs from "dayjs";
import type { CrawlerConfig } from "./config.js";
import { parseCourtIncidentId } from "./incident.js";
import { normalizeDate, normalizeText } from "./normalize.js";
import { crawlResultSchema } from "./schema.js";
import { buildJudgeDateRangeFilter, generateCourtSearchUrl } from "./search.js";

// LISTは一覧ページ、DETAILは詳細ページの処理分岐に使う。
type RequestLabel = "LIST" | "DETAIL";

export const runCrawler = async (config: CrawlerConfig) => {
  const queue = await RequestQueue.open();
  const db = createDatabase({
    url: config.turso.url,
    authToken: config.turso.authToken,
  });
  await runMigrations(db);

  const executedAt = new Date().toISOString();
  const crawlRange: NewCrawlRange = {
    start_date: config.crawlRange.startDate,
    end_date: config.crawlRange.endDate,
    executed_at: executedAt,
    version: config.crawlRange.version,
  };
  await db.insert(crawl_ranges).values(crawlRange).run();

  const firstSearchPageURL = generateCourtSearchUrl({
    filter: buildJudgeDateRangeFilter(
      config.dateRange?.startDate || "2020-01-01",
      config.dateRange?.endDate || dayjs().format("YYYY-MM-DD"),
    ),
  });

  await queue.addRequest({
    url: firstSearchPageURL,
    userData: { label: "LIST" },
  });

  const crawler = new CheerioCrawler({
    requestQueue: queue,
    maxConcurrency: 1,
    requestHandler: async ({ request, $, enqueueLinks, log }) => {
      const label = request.userData.label as RequestLabel | undefined;

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // LIST/DETAILの種別ごとに処理を分ける。
      switch (label) {
        case "DETAIL": {
          log.info(`processing detail page: ${request.url}`);
          const detail = extractDetail($, request.url, config);
          // 必須項目が欠けている詳細ページは記録せずにスキップする。
          if (!detail) {
            log.warning(`detail missing required fields: ${request.url}`);
            return;
          }

          // 出力前に判決日のフィルタ条件を適用する。
          if (config.dateRange && !inDateRange(detail.decision_date, config)) {
            return;
          }

          const existing = await db
            .select({ case_id: cases.case_id })
            .from(cases)
            .where(eq(cases.court_incident_id, detail.court_incident_id))
            .get();

          if (existing) {
            log.info(`skip existing: ${detail.court_incident_id}`);
            return;
          }

          const incidentId = await ensureIncidentId(db, detail.court_incident_id, log);
          const caseId = createUuidV7();
          const ingestedAt = new Date().toISOString();
          const caseRow: NewCase = {
            case_id: caseId,
            court_incident_id: detail.court_incident_id,
            incident_id: incidentId,
            case_title: detail.case_title,
            case_type_guess: detail.case_type_guess ?? "unknown",
            decision_date: detail.decision_date,
            court_name: detail.court_name ?? null,
            detail_url: detail.detail_url,
            pdf_url: detail.pdf_url,
            pdf_hash: null,
            ingested_at: ingestedAt,
          };

          await db.insert(cases).values(caseRow).run();

          if (detail.outcome_type || detail.result) {
            const outcomeRow: NewOutcome = {
              case_id: caseId,
              outcome_type: detail.outcome_type ?? "不明",
              main_text: null,
              result: detail.result ?? "不明",
              created_at: ingestedAt,
            };
            await db
              .insert(outcomes)
              .values(outcomeRow)
              .onConflictDoUpdate({
                target: outcomes.case_id,
                set: {
                  outcome_type: outcomeRow.outcome_type,
                  result: outcomeRow.result,
                },
              })
              .run();
          }

          const ingestJob: NewIngestJob = {
            ingest_job_id: createUuidV7(),
            case_id: caseId,
            status: "pending",
            queued_at: ingestedAt,
            started_at: null,
            completed_at: null,
            error_message: null,
          };
          await db
            .insert(ingest_jobs)
            .values(ingestJob)
            .onConflictDoNothing({ target: ingest_jobs.case_id })
            .run();
          return;
        }
        case "LIST": {
          log.info(`processing list page: ${request.url}`);

          await enqueueLinks({
            selector: ".search-result-table tr th a",
            userData: { label: "DETAIL" },
          });

          if ($(".pagination a[title='次へ']").length > 0) {
            const params = new URLSearchParams(request.url);
            const currentOffset = params.get("offset");
            const nextOffset = currentOffset ? Number.parseInt(currentOffset, 10) + 10 : 10;
            const nextPageLink = new URL(request.url);
            nextPageLink.searchParams.set("offset", nextOffset.toString());
            await queue.addRequest({
              url: nextPageLink.toString(),
              userData: { label: "LIST" },
            });
          }

          return;
        }
        default: {
          // LIST/DETAIL以外は無視してログだけ残す。
          log.warning(`skip unknown label: ${label ?? "undefined"}`);
          return;
        }
      }
    },
    failedRequestHandler: async ({ request, log }) => {
      log.error(`request failed ${request.url}`);
    },
  });

  await crawler.run();
};

const extractDetail = ($: CheerioAPI, requestUrl: string, config: CrawlerConfig) => {
  const pageUrl = requestUrl;
  const pdfHref = normalizeText($(".module-sub-page-parts-table a[href$='.pdf']").attr("href"));
  const pdfUrl = pdfHref ? new URL(pdfHref, requestUrl).toString() : "";

  const getDetailValue = (label: string) => {
    const entry = $(".module-sub-page-parts-table dl")
      .filter((_, element) => normalizeText($(element).children("dt").text()) === label)
      .first();
    if (!entry.length) {
      return "";
    }
    return normalizeText(entry.children("dd").text());
  };

  const courtIncidentId = getDetailValue("事件番号");
  const caseTitle = getDetailValue("事件名");
  const decisionDate = normalizeDate(getDetailValue("裁判年月日"));
  const courtName = getDetailValue("法廷名");
  const outcomeType = getDetailValue("裁判種別");
  const outcomeResult = getDetailValue("結果");

  // 必須項目が揃わない詳細ページは除外する。
  if (!pdfUrl || !decisionDate || !courtIncidentId || !caseTitle) {
    return null;
  }

  const parsed = crawlResultSchema.safeParse({
    detail_url: pageUrl,
    pdf_url: pdfUrl,
    decision_date: decisionDate,
    court_incident_id: courtIncidentId,
    case_title: caseTitle,
    court_name: courtName || undefined,
    outcome_type: outcomeType || undefined,
    result: outcomeResult || undefined,
  });

  if (!parsed.success) {
    console.error(parsed.error.format());
    return null;
  }

  return parsed.data;
};

const inDateRange = (date: string, config: CrawlerConfig) => {
  if (!config.dateRange) {
    return true;
  }
  return date >= config.dateRange.startDate && date <= config.dateRange.endDate;
};

const ensureIncidentId = async (
  db: ReturnType<typeof createDatabase>,
  courtIncidentId: string,
  log: { warning: (message: string) => void },
) => {
  const parsed = parseCourtIncidentId(courtIncidentId);
  if (!parsed) {
    log.warning(`incident parse failed: ${courtIncidentId}`);
    return null;
  }

  const category = await db
    .select({ category_id: incident_categories.category_id })
    .from(incident_categories)
    .where(eq(incident_categories.code, parsed.incident_category_code))
    .get();

  if (!category) {
    log.warning(`incident category missing: ${parsed.incident_category_code}`);
    return null;
  }

  await db
    .insert(court_incidents)
    .values({
      raw_text: parsed.raw_text,
      incident_era: parsed.incident_era,
      incident_year: parsed.incident_year,
      incident_number: parsed.incident_number,
      category_id: category.category_id,
    })
    .onConflictDoNothing({
      target: [
        court_incidents.incident_era,
        court_incidents.incident_year,
        court_incidents.category_id,
        court_incidents.incident_number,
      ],
    })
    .run();

  const incident = await db
    .select({ incident_id: court_incidents.incident_id })
    .from(court_incidents)
    .where(
      and(
        eq(court_incidents.incident_era, parsed.incident_era),
        eq(court_incidents.incident_year, parsed.incident_year),
        eq(court_incidents.category_id, category.category_id),
        eq(court_incidents.incident_number, parsed.incident_number),
      ),
    )
    .get();

  return incident?.incident_id ?? null;
};
