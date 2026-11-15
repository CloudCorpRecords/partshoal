# partshoal

Finding the right spare part for marine equipment usually means knowing which OEM brand built the machine, which model you are looking at, and which part number actually fits. partshoal is a small local bridge to the Dolphin Industrial Parts MCP service: it lets you browse the brands and models the service quotes for, page through a family's catalogue, look up a part number, prepare a quote request, and read the site manifest.

Nothing is stored or computed on your own machine. This package answers `tools/list` locally from the captured tool definitions and forwards every `tools/call` to the hosted service over a streamable-HTTP JSON-RPC session, returning whatever the service sends back unchanged. Parts listed are compatible alternatives, not OEM parts, and availability and price are quoted per application — no tool in this surface returns a price.

All six captured tools are built here; there are no omissions. In particular, `request_quote` only prepares a request: per its own description it never submits anything, and instead returns the cleaned request, the quote form URL and contact details so the customer can send it themselves.

## The tools

- **`lookup_part`** — Looks up a part number (required: `part_number`). Tries an exact match, then a prefix match, then a format-based guess of brand and family. Returns matching parts, ordering guidance and the quote form URL.
- **`list_brands`** — Lists the OEM brands and equipment families quoted, with model counts. Takes no required arguments.
- **`list_models`** — Lists the equipment models and series quoted for one OEM brand (required: `brand`).
- **`list_catalog`** — Pages through catalogue parts for one equipment family, 100 per page (required: `family`; optional `page`).
- **`request_quote`** — Prepares a parts quote request from part numbers, quantities and equipment details. It never submits anything; it returns the cleaned request, the quote form URL and contact details. Takes no required arguments.
- **`get_manifest`** — Returns the site manifest: contact details, endpoints, tools, limits and disclaimer. Takes no required arguments.

## Install and run

As an MCP server via npm:

```bash
npx -y @reneturcios/partshoal mcp
```

MCP client configuration:

```json
{
  "mcpServers": {
    "partshoal": {
      "command": "npx",
      "args": ["-y", "@reneturcios/partshoal", "mcp"]
    }
  }
}
```

As a container:

```bash
docker run -i ghcr.io/cloudcorprecords/partshoal
docker run --rm ghcr.io/cloudcorprecords/partshoal lookup_part '{"part_number":"223401-28"}'
```

## CLI

One binary serves both the command line and the MCP server. Each tool is a subcommand taking a single JSON string with that tool's arguments:

```bash
partshoal lookup_part '{"part_number":"223401-28"}'
partshoal list_brands '{}'
partshoal list_models '{"brand":"IMO"}'
partshoal list_catalog '{"family":"pumps","page":1}'
partshoal get_manifest '{}'
partshoal --version
```

Exit codes: `0` when the forwarded call succeeds, `1` when the upstream result is an error, and `2` for usage problems such as an unknown subcommand or a malformed JSON argument.

## Configuration

- `DOLPHINPARTS_MCP_URL` — Overrides the upstream endpoint. The default is the pinned hosted endpoint, `https://dolphinindustrialparts.com/agent/mcp`. (The override variable is a reconstruction added by this rebuild.)

No credentials are configured or sent: the upstream record declares no auth headers and the surface was captured keyless, so this client never sends an `Authorization` or `X-API-Key` header.

Upstream failures — a JSON-RPC error from the service, a non-2xx response, an unreadable body, or a request that fails outright — are reported to the caller as an error result whose text starts with `partshoal error:`.

## How forwarding works

The first forwarded call opens a session: an `initialize` request (protocol version `2025-03-26`), followed by a `notifications/initialized` notification, then the `tools/call` itself. If the service answers the initialize request with an `Mcp-Session-Id` header, that value is carried on every later request, and the open session is reused for the rest of the process. Replies are accepted either as plain JSON or as server-sent events. Successful results pass through verbatim, including any `isError` flag and any extra fields the service includes.

## Development

```bash
npm install
npm run build   # tsc -> dist/ (dist/cli.js is the bin)
npm test        # tsx --test test/*.test.ts — stubbed upstream, no network
npm run dev     # run the CLI from source
```

The test suite checks the served tool list against the captured surface, exercises the session handshake and its reuse, asserts that no auth header is ever sent, covers the endpoint override, and verifies that arguments go upstream untouched and results come back untouched.

## License

MIT — see `LICENSE`. Copyright (c) 2026 Rene Turcios.
