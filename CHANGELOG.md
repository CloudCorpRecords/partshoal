# Changelog

## 0.1.0 (2026-10-28)

- First release: a forwarding client for the Dolphin Industrial Parts MCP server. All 6 captured tools are answered locally for tools/list, and every tools/call is forwarded upstream over a streamable-HTTP JSON-RPC session (initialize, notifications/initialized, tools/call, honouring the Mcp-Session-Id header when the upstream issues one).
- Tools: `lookup_part`, `list_brands`, `list_models`, `list_catalog`, `request_quote`, `get_manifest`. No omissions: `request_quote` is kept in full because its captured description states it never submits anything — it returns the cleaned request, the quote form URL and contact details for the customer to send.
- Upstream results pass through verbatim, including the isError flag; upstream failures surface as `partshoal error:` text results.
- One bin serves the CLI (one subcommand per tool, plus `--version`) and the stdio MCP server (`mcp` subcommand). The upstream endpoint can be overridden via `DOLPHINPARTS_MCP_URL`. No auth header is ever sent: the upstream record declares none and the surface was captured keyless.
