/**
 * partshoal core: a forwarding client for the Dolphin
 * Industrial Parts MCP server.
 *
 * No catalogue data lives on this machine. tools/list is
 * answered from the literal definitions below, which
 * reproduce a live capture of the upstream server word
 * for word (name, title, description and inputSchema
 * exactly as captured). A tools/call travels upstream
 * over a streamable-HTTP JSON-RPC session: an initialize
 * POST, a notifications/initialized POST, then the
 * tools/call POST, carrying the Mcp-Session-Id response
 * header on later requests when the upstream issues one.
 * The session opens lazily on the first forwarded call
 * and is reused for the client's lifetime.
 *
 * The endpoint is pinned to
 * https://dolphinindustrialparts.com/agent/mcp and may be
 * replaced with the DOLPHINPARTS_MCP_URL environment
 * variable (that override is a labelled reconstruction).
 * The registry record declares no auth headers and the
 * capture answered keyless, so this client never sends
 * an Authorization or X-API-Key header (or any other
 * credential header) on any upstream request.
 *
 * A successful upstream result is returned exactly as
 * received, isError flag and extra fields included.
 * Failures — an upstream JSON-RPC error, a non-2xx
 * status, a body that cannot be parsed, or a fetch
 * that throws or times out — become an isError result
 * whose text begins with `partshoal error:` (that
 * rendering is a labelled reconstruction). Replies may
 * be plain JSON or SSE (`data:` lines); the JSON-RPC
 * message whose id matches the request wins.
 */
import type {
  FetchFn,
  FetchResponseLike,
  ForwardDeps,
  ToolArgs,
  ToolDef,
  ToolResult,
} from "./types.js";

export const VERSION = "0.1.0";

export const DEFAULT_ENDPOINT_URL = "https://dolphinindustrialparts.com/agent/mcp";

export const DEFAULT_TIMEOUT_MS = 30000;

export const PROTOCOL_VERSION = "2025-03-26";

/* ------------------------------------------------------------------ */
/* Tool definitions (tools/list literals, verbatim from the live       */
/* capture in harness/fixtures/dolphinparts-tools-original.json;       */
/* generated programmatically by parsing and re-serialising the        */
/* fixture JSON, never retyped)                                        */
/* ------------------------------------------------------------------ */

export const TOOL_DEFS: ToolDef[] = [
  {
    "name": "lookup_part",
    "title": "Look up a part number",
    "description": "Look up a part number: exact match, then prefix match, then a format-based guess of brand and family (not a confirmed match). Returns matching parts, how to order and the quote form URL. Parts are compatible alternatives, not OEM parts. Availability and price are quoted per application.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "part_number": {
          "type": "string",
          "maxLength": 40,
          "description": "Part number, for example 223401-28 or P190123.",
          "minLength": 2
        }
      },
      "required": [
        "part_number"
      ],
      "additionalProperties": false
    }
  },
  {
    "name": "list_brands",
    "title": "List OEM brands",
    "description": "List the OEM brands and equipment families for which Dolphin Industrial Parts quotes compatible parts, with model counts. Availability and price are quoted per application.",
    "inputSchema": {
      "type": "object",
      "properties": {},
      "additionalProperties": false
    }
  },
  {
    "name": "list_models",
    "title": "List models for a brand",
    "description": "List the equipment models and series quoted for one OEM brand (for example IMO, Moatti, Alfa Laval). Use list_brands for brand names. Availability and price are quoted per application.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "brand": {
          "type": "string",
          "maxLength": 80,
          "description": "OEM brand name as returned by list_brands.",
          "minLength": 1
        }
      },
      "required": [
        "brand"
      ],
      "additionalProperties": false
    }
  },
  {
    "name": "list_catalog",
    "title": "Page through catalog parts",
    "description": "Page through catalog parts for one equipment family, 100 per page. Returns part numbers and descriptions with paging info. Availability and price are quoted per application.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "family": {
          "type": "string",
          "enum": [
            "pumps",
            "fresh-water-generators",
            "self-cleaning-filters",
            "uv-sterilizers",
            "rehardening-filters",
            "plate-heat-exchanger-gaskets",
            "tank-cleaning-machines",
            "compressor-parts",
            "separator-parts"
          ],
          "description": "Equipment family slug."
        },
        "page": {
          "type": "integer",
          "minimum": 1,
          "default": 1,
          "description": "1-based page number."
        }
      },
      "required": [
        "family"
      ],
      "additionalProperties": false
    }
  },
  {
    "name": "request_quote",
    "title": "Prepare a quote request",
    "description": "Prepare a parts quote request (part numbers, quantities, equipment type, make, model, serial, country, notes). It never submits anything: it returns the cleaned request, the quote form URL and contact details so the customer can send it. Quotes are in USD within 1 business day. Availability and price are quoted per application.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "part_number": {
          "type": "string",
          "maxLength": 80,
          "description": "Single part number (use parts for several)."
        },
        "description": {
          "type": "string",
          "maxLength": 300,
          "description": "Part description."
        },
        "quantity": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100000,
          "description": "Quantity."
        },
        "parts": {
          "type": "array",
          "maxItems": 25,
          "description": "Parts to quote.",
          "items": {
            "type": "object",
            "properties": {
              "part_number": {
                "type": "string",
                "maxLength": 80,
                "description": "Part number."
              },
              "description": {
                "type": "string",
                "maxLength": 300,
                "description": "Description."
              },
              "quantity": {
                "type": "integer",
                "minimum": 1,
                "maximum": 100000,
                "description": "Quantity."
              }
            },
            "additionalProperties": false
          }
        },
        "equipment_type": {
          "type": "string",
          "maxLength": 80,
          "description": "For example Pump, Separator / Centrifuge, Fresh Water Generator."
        },
        "make": {
          "type": "string",
          "maxLength": 120,
          "description": "Equipment make."
        },
        "model": {
          "type": "string",
          "maxLength": 120,
          "description": "Equipment model."
        },
        "serial": {
          "type": "string",
          "maxLength": 120,
          "description": "Serial number."
        },
        "country": {
          "type": "string",
          "enum": [
            "United States",
            "Canada",
            "Mexico",
            "Other"
          ],
          "description": "Ship-to country."
        },
        "notes": {
          "type": "string",
          "maxLength": 3000,
          "description": "Anything that helps identify the part."
        }
      },
      "additionalProperties": false
    }
  },
  {
    "name": "get_manifest",
    "title": "Get the site manifest",
    "description": "Site, contact details, endpoints, tools, limits and disclaimer for Dolphin Industrial Parts. Availability and price are quoted per application.",
    "inputSchema": {
      "type": "object",
      "properties": {},
      "additionalProperties": false
    }
  }
];

export const TOOL_NAMES = TOOL_DEFS.map((t) => t.name);

/** Whether `name` belongs to the captured built surface. */
export function isKnownTool(name: string): boolean {
  return TOOL_NAMES.includes(name);
}

/* ------------------------------------------------------------------ */
/* Forwarding client                                                   */
/* ------------------------------------------------------------------ */

function errorResult(detail: string): ToolResult {
  return {
    content: [{ type: "text", text: `partshoal error: ${detail}` }],
    isError: true,
  };
}

function rpcErrorMessage(error: unknown): string {
  if (error !== null && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message !== "") return message;
    return JSON.stringify(error);
  }
  return String(error);
}

/**
 * Read a JSON-RPC response body, tolerating SSE framing.
 * Returns the message whose id matches `expectedId` when
 * present, otherwise the last parseable message, otherwise
 * null when nothing in the body parses.
 */
export function parseRpcBody(
  text: string,
  expectedId?: number,
): Record<string, unknown> | null {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  const candidates: Record<string, unknown>[] = [];
  const tryPush = (payload: string): void => {
    try {
      const parsed: unknown = JSON.parse(payload);
      if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
        candidates.push(parsed as Record<string, unknown>);
      }
    } catch {
      // Not a JSON payload; skip this candidate.
    }
  };
  if (trimmed.includes("data:")) {
    for (const line of trimmed.split("\n")) {
      const t = line.trim();
      if (!t.startsWith("data:")) continue;
      const payload = t.slice("data:".length).trim();
      if (payload !== "" && payload !== "[DONE]") tryPush(payload);
    }
  } else {
    tryPush(trimmed);
  }
  if (candidates.length === 0) return null;
  if (expectedId !== undefined) {
    const match = candidates.find((c) => c.id === expectedId);
    if (match !== undefined) return match;
  }
  return candidates[candidates.length - 1];
}

async function defaultFetch(
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  },
): Promise<FetchResponseLike> {
  return fetch(url, init) as unknown as FetchResponseLike;
}

/**
 * A forwarding client holding a single upstream session,
 * opened lazily on first use and reused from then on
 * (for the process lifetime in the MCP server, or for a
 * single invocation in the CLI).
 */
export class PartshoalClient {
  private readonly deps: ForwardDeps;
  private sessionId: string | null = null;
  private ready = false;
  private sessionPromise: Promise<void> | null = null;
  private idCounter = 0;

  constructor(deps: ForwardDeps = {}) {
    this.deps = deps;
  }

  private fetchFn(): FetchFn {
    return this.deps.fetchFn ?? defaultFetch;
  }

  private endpointUrl(): string {
    if (this.deps.url && this.deps.url.trim() !== "") return this.deps.url.trim();
    const raw = (this.deps.env ?? process.env).DOLPHINPARTS_MCP_URL;
    if (raw && raw.trim() !== "") return raw.trim();
    return DEFAULT_ENDPOINT_URL;
  }

  private timeoutMs(): number {
    if (typeof this.deps.timeoutMs === "number" && this.deps.timeoutMs > 0) {
      return this.deps.timeoutMs;
    }
    return DEFAULT_TIMEOUT_MS;
  }

  private nextId(): number {
    this.idCounter += 1;
    return this.idCounter;
  }

  private async post(
    body: unknown,
    withSession: boolean,
  ): Promise<FetchResponseLike> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    };
    if (withSession && this.sessionId !== null) {
      headers["Mcp-Session-Id"] = this.sessionId;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs());
    try {
      return await this.fetchFn()(this.endpointUrl(), {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  private async ensureSession(): Promise<void> {
    if (this.ready) return;
    if (this.sessionPromise === null) {
      this.sessionPromise = (async () => {
        const initId = this.nextId();
        const initRes = await this.post(
          {
            jsonrpc: "2.0",
            id: initId,
            method: "initialize",
            params: {
              protocolVersion: PROTOCOL_VERSION,
              capabilities: {},
              clientInfo: { name: "partshoal", version: VERSION },
            },
          },
          false,
        );
        const sessionId = initRes.headers.get("mcp-session-id");
        if (sessionId) this.sessionId = sessionId;
        const initText = await initRes.text();
        const initParsed = parseRpcBody(initText, initId);
        if (initParsed !== null && initParsed.error) {
          throw new Error(rpcErrorMessage(initParsed.error));
        }
        if (initRes.status < 200 || initRes.status >= 300) {
          throw new Error(`HTTP ${initRes.status}`);
        }
        if (initParsed === null && initText.trim() !== "") {
          throw new Error("malformed response");
        }
        const initializedRes = await this.post(
          { jsonrpc: "2.0", method: "notifications/initialized" },
          true,
        );
        try {
          await initializedRes.text();
        } catch {
          // Nothing needed from the notification response body.
        }
        this.ready = true;
      })();
    }
    try {
      await this.sessionPromise;
    } catch (err) {
      this.sessionPromise = null;
      this.sessionId = null;
      throw err;
    }
  }

  /** Forward one tool call; upstream failures come back as isError results. */
  async callTool(name: string, args: ToolArgs): Promise<ToolResult> {
    try {
      await this.ensureSession();
    } catch (err) {
      return errorResult(err instanceof Error ? err.message : String(err));
    }

    const callId = this.nextId();
    let callRes: FetchResponseLike;
    try {
      callRes = await this.post(
        {
          jsonrpc: "2.0",
          id: callId,
          method: "tools/call",
          params: { name, arguments: args ?? {} },
        },
        true,
      );
    } catch (err) {
      return errorResult(
        `request failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const parsed = parseRpcBody(await callRes.text(), callId);
    if (parsed !== null && parsed.error) {
      return errorResult(rpcErrorMessage(parsed.error));
    }
    if (callRes.status < 200 || callRes.status >= 300) {
      return errorResult(`HTTP ${callRes.status}`);
    }
    if (parsed === null) return errorResult("malformed response");
    const result = parsed.result as ToolResult | undefined;
    if (result === undefined || result === null || typeof result !== "object") {
      return errorResult("malformed response");
    }
    // Hand the upstream result back exactly as received.
    return result;
  }
}

/** Build a forwarding client; tests inject a fake fetch and env through deps. */
export function createClient(deps: ForwardDeps = {}): PartshoalClient {
  return new PartshoalClient(deps);
}

/** One-shot helper: a fresh client for a single call (the CLI path). */
export async function callTool(
  name: string,
  args: ToolArgs,
  deps: ForwardDeps = {},
): Promise<ToolResult> {
  return new PartshoalClient(deps).callTool(name, args);
}
