import { sValidator } from "@hono/standard-validator";
import { Hono } from "hono";
import type { Context } from "hono";
import { z } from "zod";

import {
  chizaiQuery,
  generalQuery,
  gyoseiQuery,
  kakyusaiQuery,
  kosaiQuery,
  rodoQuery,
  saikosaiQuery,
} from "./courts/search-query";
import {
  parseCourtSearchResults,
  UpstreamFormatError,
  UpstreamResultLimitError,
} from "./courts/search-results";
import {
  buildCourtSearchUrl,
  InvalidSearchRequest,
  type SearchPage,
  type SearchQueryParams,
} from "./courts/search-url";
import {
  CourtDetailFormatError,
  fetchCourtDetail,
  InvalidCourtDetailUrlError,
} from "./courts/detail";
import { findPreviousJudgment } from "./courts/previous";
import { searchWikipedia } from "./wikipedia";

const app = new Hono();

// TODO: ここらへんのクエリのスキーマを括り出す
const detailQuery = z.strictObject({ url: z.url() });
const wikipediaQuery = z.strictObject({
  query: z.string().trim().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(5).default(5),
});
const previousQuery = z.strictObject({ caseNumber: z.string().trim().min(1).max(100) });

const errorBody = (code: string, message: string) => ({ error: { code, message } });

const validationHook = (
  result: { success: boolean },
  context: { json: (body: ReturnType<typeof errorBody>, status: 400) => Response },
) => {
  if (!result.success) {
    return context.json(errorBody("VALIDATION_ERROR", "Request validation failed"), 400);
  }
};

const searchCourt = async (
  context: Context,
  category: string,
  page: SearchPage,
  query: SearchQueryParams,
) => {
  let searchUrl: URL;
  try {
    searchUrl = buildCourtSearchUrl(page, query);
  } catch (error) {
    if (error instanceof InvalidSearchRequest) {
      return context.json(errorBody("VALIDATION_ERROR", error.message), 400);
    }
    throw error;
  }

  let upstream: Response;
  try {
    upstream = await fetch(searchUrl, {
      headers: { Accept: "text/html" },
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    console.error("Court search request failed", error);
    return context.json(
      errorBody("UPSTREAM_UNAVAILABLE", "The court search could not be reached"),
      502,
    );
  }

  if (!upstream.ok || !upstream.headers.get("content-type")?.includes("text/html")) {
    const retryAfter = upstream.headers.get("retry-after");
    if (upstream.status === 429 && retryAfter) context.header("Retry-After", retryAfter);
    return context.json(
      errorBody("UPSTREAM_ERROR", `The court search returned HTTP ${upstream.status}`),
      upstream.status === 429 ? 503 : 502,
    );
  }

  try {
    const data = await parseCourtSearchResults(upstream, searchUrl);
    return context.json({
      source: "courts.go.jp",
      category,
      upstreamUrl: searchUrl.href,
      ...data,
    });
  } catch (error) {
    if (error instanceof UpstreamResultLimitError) {
      return context.json(errorBody("UPSTREAM_RESULT_LIMIT", error.message), 422);
    }
    if (error instanceof UpstreamFormatError) {
      console.error("Court search response format changed", error);
      return context.json(errorBody("UPSTREAM_FORMAT_ERROR", error.message), 502);
    }
    throw error;
  }
};

app.get("/courts/hanrei/search/general", sValidator("query", generalQuery, validationHook), (c) =>
  searchCourt(c, "general", 1, c.req.valid("query")),
);

app.get("/courts/hanrei/search/saikosai", sValidator("query", saikosaiQuery, validationHook), (c) =>
  searchCourt(c, "saikosai", 2, c.req.valid("query")),
);

app.get("/courts/hanrei/search/kosai", sValidator("query", kosaiQuery, validationHook), (c) =>
  searchCourt(c, "kosai", 3, c.req.valid("query")),
);

app.get("/courts/hanrei/search/kakyusai", sValidator("query", kakyusaiQuery, validationHook), (c) =>
  searchCourt(c, "kakyusai", 4, c.req.valid("query")),
);

app.get("/courts/hanrei/search/gyosei", sValidator("query", gyoseiQuery, validationHook), (c) =>
  searchCourt(c, "gyosei", 5, c.req.valid("query")),
);

app.get("/courts/hanrei/search/rodo", sValidator("query", rodoQuery, validationHook), (c) =>
  searchCourt(c, "rodo", 6, c.req.valid("query")),
);

app.get("/courts/hanrei/search/chizai", sValidator("query", chizaiQuery, validationHook), (c) =>
  searchCourt(c, "chizai", 7, c.req.valid("query")),
);

app.get(
  "/courts/hanrei/detail",
  sValidator("query", detailQuery, validationHook),
  async (context) => {
    try {
      return context.json(await fetchCourtDetail(context.req.valid("query").url));
    } catch (error) {
      if (error instanceof InvalidCourtDetailUrlError) {
        return context.json(errorBody("VALIDATION_ERROR", error.message), 400);
      }
      if (error instanceof CourtDetailFormatError) {
        return context.json(errorBody("UPSTREAM_FORMAT_ERROR", error.message), 422);
      }
      console.error("Court detail request failed", error);
      return context.json(errorBody("UPSTREAM_ERROR", "The court detail could not be read"), 502);
    }
  },
);

app.get(
  "/wikipedia/search",
  sValidator("query", wikipediaQuery, validationHook),
  async (context) => {
    const { query, limit } = context.req.valid("query");
    try {
      return context.json(await searchWikipedia(query, limit));
    } catch (error) {
      console.error("Wikipedia search failed", error);
      return context.json(errorBody("UPSTREAM_ERROR", "Wikipedia search failed"), 502);
    }
  },
);

app.get(
  "/courts/hanrei/previous",
  sValidator("query", previousQuery, validationHook),
  async (context) => {
    try {
      return context.json(await findPreviousJudgment(context.req.valid("query").caseNumber));
    } catch (error) {
      console.error("Previous judgment lookup failed", error);
      return context.json(errorBody("UPSTREAM_ERROR", "Previous judgment lookup failed"), 502);
    }
  },
);

app.notFound((context) => context.json(errorBody("NOT_FOUND", "Route not found"), 404));

app.onError((error, context) => {
  console.error("External service request failed", error);
  return context.json(errorBody("INTERNAL_SERVER_ERROR", "Internal server error"), 500);
});

export default app;
