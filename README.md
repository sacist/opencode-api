# opencode-server

A self-hosted REST bridge to the **OpenCode Go** model provider.
Node.js 22 · TypeScript · Express · SQLite.

**The main advantage is the cheap subscription which gives you 60$ of balance for only 5$.**
**Token price stays the same making it 12x cheaper than using a normal api.**
**Also it gives you opencode agentic advantages you can utilize through the api.**

## Quick start

```bash
cp .example.env .env       # then edit .env
npm run docker:up          # build + start detached
npm run docker:logs        # follow logs
npm run docker:down        # stop
```

Change `PORT` in `.env` and `npm run docker:restart` to re-publish on a new
port. For local (non-Docker) runs:

```bash
npm install -g opencode-ai && npm install
npm run init && npm run start
```

### `.env` reference

```
PORT=3000                          # server port (also Docker HOST:CONTAINER)
DB_PATH=./data/dev.sqlite          # SQLite database file
LOG_DIR=./logs                     # Pino logs (daily rotation)
BCRYPT_ROUNDS=10                   # password hashing cost (4–15)
OPENCODE_GO_BASE_URL=https://...   # provider base URL (You should use the default value and only change if it's not working)
OPENCODE_GO_API_KEY=sk-...         # provider API key (required)
ADMIN_USERNAME=admin               # bootstrap admin (required)
ADMIN_PASSWORD=1234                # bootstrap admin password (required)
MAX_IMAGE_MEGABYTES=3              # max base64 image size per attachment
```

## Exposing to the internet

`docker compose` publishes on `0.0.0.0`, so you need all three: a
**public static IP**, a **router port-forward** (external `<PORT>` → host LAN
IP), and a **Windows Firewall rule or ufw allow port/tcp**:

```powershell
New-NetFirewallRule -DisplayName "opencode-server" `
  -Direction Inbound -LocalPort 6007 -Protocol TCP -Action Allow
```

In production, put a reverse proxy (Caddy / Nginx / Traefik) in front and
terminate TLS there.

## Authentication & response format

Every request must carry `username` and `password` headers (no sessions, no
JWT). Admin-only routes such as /auth/add additionally check the role via `requireRole`.

```jsonc
// success
{ "success": true, "data": <payload> }
// error
{ "code": "VALIDATION_ERROR", "text": "Validation failed", "data": { "issues": [...] } }
```

Codes: `AUTH_HEADERS_MISSING` (401), `AUTH_INVALID` (401), `FORBIDDEN_ROLE` (403),
`USER_EXISTS` (409), `VALIDATION_ERROR` (400), `INTERNAL_ERROR` (500).

Request bodies are limited to **30 MB** (Express `json` limit, to fit up to 5
base64 images × 3 MB). Malformed JSON is caught before route handlers and
returned as `400 VALIDATION_ERROR` with `data.reason = "Вы прислали не валидный json"`.

## API reference

> All endpoints require `Content-Type: application/json` + `username` /
> `password` headers. **Admin** = caller must have the `admin` role.

### `POST /auth/add` — admin

Create a new user (role `user`) and provision a workspace.

| Field      | Type   | Constraints  |
|------------|--------|--------------|
| `username` | string | 3–64 chars   |
| `password` | string | 4–128 chars  |

### `POST /opencode/agent`

Agent run: reads the user's `AGENTS.md` as system context. By default the
response is also merged into `context.md` (long-term memory) — the model
returns a structured `{ answer, context }` JSON, and `answer` is surfaced
to the caller. Pass `updateContext: false` for a faster, stateless run that
skips the `context.md` write and returns the last text part of the model
output as-is.

| Field            | Type    | Constraints                                                                                                |
|------------------|---------|------------------------------------------------------------------------------------------------------------|
| `model`          | enum    | `minimax-m3` · `minimax-m2.7` · `qwen3.7-max` · `qwen3.7-plus` · `qwen3.6-plus` · `glm-5.2` · `glm-5.1` · `kimi-k2.7-code` · `kimi-k2.6` · `deepseek-v4-pro` · `deepseek-v4-flash` · `mimo-v2.5` · `mimo-v2.5-pro` |
| `prompt`         | string  | 1–32768 chars                                                                                              |
| `updateContext`  | boolean | default `true`. If `false`, response is not written to `context.md`. See [Response shapes](#response-shapes) for how this interacts with `schema`. |
| `attachments`    | array?  | optional. Up to 5 image blocks in Anthropic format. Each ≤ 3 МБ, `image/{png,jpeg,gif,webp}`, base64. |
| `schema`         | object? | optional. Any JSON Schema (draft-07 compatible). When set, the model's `answer` is validated against it and returned as `structured` instead of `text`. See [Structured output](#structured-output). |
| `schema_retries` | number  | default `3`. How many times the provider should retry when the model output doesn't validate against `schema` (only meaningful when `schema` is set). |

`attachments` element:
```jsonc
{
  "type": "image",
  "source": {
    "type": "base64",
    "media_type": "image/png",  // image/jpeg | image/png | image/gif | image/webp
    "data": "<base64 без префикса data:>"
  }
}
```

**Vision models.** Only vision-capable models can receive images. If
`attachments` is non-empty and `model` is not vision-capable, the server
rejects the request with `400 VALIDATION_ERROR` and the list of supported
vision models. Currently: `minimax-m3`, `kimi-k2.6`. The list is derived
dynamically from `src/modules/opencode/consts.ts` → `VISION_MODELS`.

Response `data`: see [Response shapes](#response-shapes).

#### Structured output

Pass a JSON Schema as `schema` to force the model to return a structured
`answer` validated against it. The schema is sent to the provider as a
`json_schema` output format with `schema_retries` retries on validation
failure. After the provider response comes back, the result is re-validated
locally with Ajv; if it still doesn't match, the request fails with
`400 VALIDATION_ERROR` and the reason `"Модель не смогла вернуть валидный json. Попробуйте ещё раз, либо используйте другую модель"`.

```jsonc
// example: sentiment classification
{
  "model": "kimi-k2.6",
  "prompt": "Classify: 'I love this'",
  "schema": {
    "type": "object",
    "properties": {
      "sentiment": { "type": "string", "enum": ["pos", "neg", "neu"] },
      "confidence": { "type": "number", "minimum": 0, "maximum": 1 }
    },
    "required": ["sentiment", "confidence"],
    "additionalProperties": false
  },
  "schema_retries": 3
}
```

With `updateContext: true` (default) the structured `answer` is still
merged into `context.md` and the caller receives the validated object as
`structured`. With `updateContext: false` the server does not wrap the
schema in `{ answer, context }` — the model's output is validated directly
against `schema` and returned as `structured`.

### `POST /opencode/api`

Stateless chat-completion proxy. If `api_key` is omitted, the server falls
back to the key stored in `./opencode.json` (the one set by `OPENCODE_GO_API_KEY`
or rotated via `POST /opencode/api-key`).

| Field         | Type      | Constraints                                                                              |
|---------------|-----------|------------------------------------------------------------------------------------------|
| `model`       | enum      | same enum as `/opencode/agent`.                                                          |
| `messages`    | array     | `[{ role: "user"\|"assistant", content: string \| TextBlock[] \| ImageBlock[] }]`. String up to 32768 chars. Up to 5 image blocks total across all messages, each ≤ 3 МБ. |
| `system`      | string?   | max 32768. Sent as `system` for Anthropic models, prepended otherwise.                   |
| `temperature` | number?   | 0–1 (default `0.7`).                                                                     |
| `max_tokens`  | number?   | 1–32768 (default `8192`).                                                                |
| `api_key`     | string?   | optional. Provider key. Falls back to `./opencode.json` → `provider.opencode-go.options.apiKey` if absent. |

`messages[].content` can be a plain string or an array of blocks (Anthropic
format). Image blocks:
```jsonc
{ "type": "image", "source": { "type": "base64", "media_type": "image/png", "data": "<base64>" } }
```
Text blocks:
```jsonc
{ "type": "text", "text": "..." }
```
For Anthropic-compatible models the array is passed through as-is. For
OpenAI-compatible models the blocks are converted to `image_url` /
`text` parts by the server.

**Vision models.** If any `messages[i].content` contains an `image` block
and `model` is not vision-capable, the server rejects the entire request
with `400 VALIDATION_ERROR` and the list of supported vision models.
Currently: `minimax-m3`, `kimi-k2.6`. The list is derived dynamically
from `src/modules/opencode/consts.ts` → `VISION_MODELS`.

Response `data`: `{ usage, text }` — see [Response shapes](#response-shapes).

### `POST /opencode/agent/md`

Write (or regenerate) the user's `AGENTS.md`.

| Field          | Type    | Constraints                                                                  |
|----------------|---------|------------------------------------------------------------------------------|
| `type`         | enum    | `"manual"` — write `prompt` verbatim. `"ai"` — generate from `prompt`.       |
| `prompt`       | string  | max 10000 chars.                                                             |
| `resetContext` | boolean | default `false`. If `true`, the user's `context.md` is cleared after the write. |

Response `data`:
- `type: "manual"` → plain string (`"AGENTS.md успешно записан. ..."`).
- `type: "ai"` → `{ usage, text }` — see [Response shapes](#response-shapes).

### Response shapes

`POST /opencode/agent` returns one of two shapes depending on whether
`schema` is provided:

| `updateContext` | `schema` | Response `data`                                       |
|-----------------|----------|-------------------------------------------------------|
| `true` (default)| absent   | `{ usage, text }` — `text` is the `answer` string     |
| `true` (default)| set      | `{ usage, structured }` — `structured` is the `answer` validated against `schema` (context is still saved) |
| `false`         | absent   | `{ usage, text }` — last text part of the model output as-is |
| `false`         | set      | `{ usage, structured }` — raw model output validated directly against `schema` (no `{ answer, context }` wrapper, no `context.md` write) |

`POST /opencode/agent/md` (`type: "ai"`) and `POST /opencode/api` always
return `{ usage, text }`.

```ts
type Usage = {
  input_tokens: number
  output_tokens: number
  cost: string   // JSON-serialized provider cost breakdown
}

type ApiReturn = {
  usage: Usage
  text: string
}

type ApiReturnStructured = {
  usage: Usage
  structured: unknown  // shape defined by the user-supplied `schema`
}
```

The `cost` field is the raw provider cost payload serialized as a JSON
string (for `POST /opencode/agent` / `/opencode/agent/md` it comes from the
embedded CLI; for `POST /opencode/api` it comes from the upstream response
under `data.cost`). For the very low cost it may be '0'.

### `POST /opencode/api-key` — admin

Rotate `OPENCODE_GO_API_KEY` for the embedded CLI and restart it.

| Field     | Type   | Constraints  |
|-----------|--------|--------------|
| `api_key` | string | 1–512 chars  |

Returns `{ "data": { "restarted": true } }`.

### Examples

```bash
# create a user (admin)
curl -X POST http://localhost:3000/auth/add \
  -H "Content-Type: application/json" \
  -H "username: admin" -H "password: 1234" \
  -d '{"username":"alice","password":"pa55w0rd"}'

# agent run
curl -X POST http://localhost:3000/opencode/agent \
  -H "Content-Type: application/json" \
  -H "username: alice" -H "password: pa55w0rd" \
  -d '{"model":"minimax-m3","prompt":"Summarize AGENTS.md"}'

# agent run with image attachments (Anthropic format, base64-encoded)
curl -X POST http://localhost:3000/opencode/agent \
  -H "Content-Type: application/json" \
  -H "username: alice" -H "password: pa55w0rd" \
  -d '{"model":"minimax-m3","prompt":"What is in these images?","attachments":[{"type":"image","source":{"type":"base64","media_type":"image/png","data":"<base64>"}}]}'

# raw chat completion
curl -X POST http://localhost:3000/opencode/api \
  -H "Content-Type: application/json" \
  -H "username: alice" -H "password: pa55w0rd" \
  -d '{"model":"qwen3.7-plus","messages":[{"role":"user","content":"hi"}],"api_key":"sk-xxx"}'

# raw chat completion with image (Anthropic-format content, OpenAI-compat model)
curl -X POST http://localhost:3000/opencode/api \
  -H "Content-Type: application/json" \
  -H "username: alice" -H "password: pa55w0rd" \
  -d '{"model":"qwen3.7-plus","messages":[{"role":"user","content":[{"type":"text","text":"describe"},{"type":"image","source":{"type":"base64","media_type":"image/png","data":"<base64>"}}]}],"api_key":"sk-xxx"}'

# agent run with structured output
curl -X POST http://localhost:3000/opencode/agent \
  -H "Content-Type: application/json" \
  -H "username: alice" -H "password: pa55w0rd" \
  -d '{"model":"kimi-k2.6","prompt":"Classify: I love this","schema":{"type":"object","properties":{"sentiment":{"type":"string","enum":["pos","neg","neu"]}},"required":["sentiment"],"additionalProperties":false},"schema_retries":3}'
```

## Scripts & storage

`npm run` scripts: `init` · `start` · `typecheck` · `test` · `test:watch` ·
`docker:up` · `docker:down` · `docker:logs` · `docker:restart` · `docker:build`.

Data persistence:

- **Users / hashes** → `${DB_PATH}` (named volume `data`).
- **Provider config** → `./opencode.json` (bind-mounted).
- **Per-user workspace** → `./workspaces/<username>/{AGENTS.md,context.md}`.
- **Logs** → `${LOG_DIR}` (Pino + daily rotation).

## Troubleshooting

- **`EADDRINUSE`** — change `PORT` in `.env` and `npm run docker:restart`.
- **Auth always fails** — check `username` / `password` headers (lowercase)
  and that `npm run init` was run.
- **`/opencode/agent` 500** — outside Docker install `opencode-ai` CLI and
  check `OPENCODE_GO_API_KEY` + `logs/app.log`.
- **Type errors** — `npm run typecheck`.
