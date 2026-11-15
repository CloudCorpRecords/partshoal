# BUILD REPORT — partshoal

Clean-room rebuild of `com.dolphinindustrialparts/parts` v1.0.0 (remote-only
MCP server at `https://dolphinindustrialparts.com/agent/mcp`), built
2026-10-28 as a forwarding client. Package: `@reneturcios/partshoal`
0.1.0, registry name `io.github.CloudCorpRecords/partshoal`.

## Surface built

**FULL surface: all 6 captured tools built, 0 omitted.**

| Tool | Required fields as served |
|------|-----------------------------|
| `lookup_part` | `part_number` |
| `list_brands` | — (no `required` key, served verbatim) |
| `list_models` | `brand` |
| `list_catalog` | `family` |
| `request_quote` | — (no `required` key, served verbatim) |
| `get_manifest` | — (no `required` key, served verbatim) |

Every served tool carries exactly the keys `name`, `title`,
`description`, `inputSchema`, and every inputSchema carries
`type: "object"` and `additionalProperties: false`, exactly as
captured. The tool literals were generated programmatically from
`harness/fixtures/dolphinparts-tools-original.json` by the script at
`/tmp/b42-partshoal-gen.py` (parse + re-serialise, placeholder
substitution from `/tmp/b42-partshoal-forward-template.ts` into
`src/forward.ts`) — never retyped — and a post-generation check (the
registration-integrity test suite, plus the parity harness) confirmed
the served literals deep-equal the fixture's 6 tool objects, in order.
Tools are registered via the MCP SDK low-level Server API
(`ListToolsRequestSchema` / `CallToolRequestSchema` handlers), not
McpServer+zod.

## The `request_quote` judgment note

`request_quote` is KEPT in full. Its own captured description states
"It never submits anything: it returns the cleaned request, the quote
form URL and contact [details]" — a compose-without-submit read (the
fiscocheck precedent), not a lead submission. It is registered,
served in tools/list, available on the CLI, and forwarded upstream
like every other tool. This contrasts with the dolphincentrifuge
`request_quote` omitted in this same batch, whose description states
it sends the user's real name/company/email to the vendor's sales
team. No prices are returned by any tool ("Availability and price are
quoted per application"); no purchase, checkout or key-minting tool
exists in the surface.

## Fixture conflicts

**None.** The spec and the fixture agree on all 6 tool names, titles,
descriptions, required fields (`part_number` / none / `brand` /
`family` / none / none) and property shapes.

## Labelled reconstructions (from the spec's Wire section)

- Upstream endpoint pinned: `https://dolphinindustrialparts.com/agent/mcp`.
- Env override `DOLPHINPARTS_MCP_URL` — labelled reconstruction.
- No auth: the registry record declares NO auth headers and the
  capture answered keyless, so the rebuild sends no key header on any
  upstream request. A dedicated test asserts no `Authorization` or
  `X-API-Key` header is sent, that only `Content-Type`, `Accept` and
  (after initialize) `Mcp-Session-Id` headers go out, and that this
  still holds when credential-like env vars happen to be set.
- Error rendering `partshoal error:` text for upstream failures —
  labelled reconstruction.
- Upstream results pass through verbatim, including `isError` and
  extra fields. tools/call is forwarded as streamable-HTTP JSON-RPC:
  initialize (protocolVersion `2025-03-26`) → notifications/initialized →
  tools/call, honouring `Mcp-Session-Id` when issued; plain-JSON and
  SSE replies are both parsed. The forwarding core takes an
  injectable fetch; tests stub the upstream — no live network calls
  in tests.

## Deviations

None.

## Lockfile

- Route: generated clean from birth in the build dir with no
  `node_modules` and no pre-existing lockfile:
  `npm install --package-lock-only --ignore-scripts --offline`.
- Parses as JSON; `name` == `@reneturcios/partshoal`.
- Package entries: **128**.
- sha256: `b4b013cb0cccad5e7abbd770b046ac895a819aebe728ec4d9212fa11956ef282`
  (re-verified unchanged after the subsequent offline `npm install`).

## server.json

- Description exactly: "Marine spare-parts catalogue: OEM brands,
  models and compatible part numbers, with quotes." — **90 characters**.
- npm package entry carries `"version": "0.1.0"`; the OCI entry
  (`ghcr.io/cloudcorprecords/partshoal:0.1.0`) carries **no**
  `version` field. Both entries carry `packageArguments`
  `[{type: positional, value: mcp}]` and transport stdio. Dockerfile
  (node:20-alpine, both stages) carries the label
  `io.modelcontextprotocol.server.name="io.github.CloudCorpRecords/partshoal"`.
  Container workflow `IMAGE` is `ghcr.io/cloudcorprecords/partshoal`
  and its smoke test asserts the server name `partshoal`.

## Verification (all run 2026-10-28, verified in the foreground from disk)

1. `npx tsc --noEmit` → exit 0.
2. `npm run build` → exit 0; real `dist/` produced (cli, forward,
   index, mcp, types — .js, .d.ts, .js.map each).
3. `node dist/cli.js --version` → `0.1.0`.
4. `npm test` → **53 tests, 53 pass, 0 fail** (registration-integrity
   suite deep-equals the served tools/list against the fixture's 6
   tools in order, plus session handling/reuse, env override,
   no-auth-header assertions, verbatim argument forwarding for all 6
   tools and result pass-through including upstream isError, SSE
   parsing, error rendering, MCP-layer validation, and CLI behaviour).
5. Parity: `python3 /home/hatch/workspace/mcp-rebuild-100/harness/parity.py --original /home/hatch/workspace/mcp-rebuild-100/harness/fixtures/dolphinparts-tools-original.json --rebuild "stdio:node /home/hatch/workspace/mcp-rebuild-100/builds/partshoal/dist/cli.js mcp" --out /home/hatch/workspace/mcp-rebuild-100/builds/partshoal/parity-out` → **verdict PASS, parity 100.0**
   (6/6 identical, 0 missing, 0 extra, no schema diffs). Output in
   `parity-out/`.
