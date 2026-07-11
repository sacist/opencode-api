# opencode-server

A self-hosted REST bridge to the **OpenCode Go** model provider.
Node.js 22 · TypeScript · Express · SQLite.

**The main advantage is the cheap subscription which gives you 60$ of balance for only 5$.**
**Token prive stays the same making it 12x cheaper than using a normal api.**
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
OPENCODE_GO_BASE_URL=https://...   # provider base URL (required)
OPENCODE_GO_API_KEY=sk-...         # provider API key (required)
ADMIN_USERNAME=admin               # bootstrap admin (required)
ADMIN_PASSWORD=1234                # bootstrap admin password (required)
```

## Exposing to the internet

`docker compose` publishes on `0.0.0.0`, so you need all three: a
**public static IP**, a **router port-forward** (external `<PORT>` → host LAN
IP), and a **Windows Firewall rule**:

```powershell
New-NetFirewallRule -DisplayName "opencode-server" `
  -Direction Inbound -LocalPort 6007 -Protocol TCP -Action Allow
```

In production, put a reverse proxy (Caddy / Nginx / Traefik) in front and
terminate TLS there.

## Authentication & response format

Every request must carry `username` and `password` headers (no sessions, no
JWT). Admin-only routes additionally check the role via `requireRole`.

```jsonc
// success
{ "success": true, "data": <payload> }
// error
{ "code": "VALIDATION_ERROR", "text": "Validation failed", "data": { "issues": [...] } }
```

Codes: `AUTH_HEADERS_MISSING` (401), `AUTH_INVALID` (401), `FORBIDDEN_ROLE` (403),
`USER_EXISTS` (409), `VALIDATION_ERROR` (400), `INTERNAL_ERROR` (500).

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

Agent run: reads the user's `AGENTS.md` as system context and merges the
response into `context.md` (long-term memory).

| Field    | Type   | Constraints                                                                                                |
|----------|--------|------------------------------------------------------------------------------------------------------------|
| `model`  | enum   | `minimax-m3` · `minimax-m2.7` · `qwen3.7-max` · `qwen3.7-plus` · `qwen3.6-plus` · `glm-5.2` · `glm-5.1` · `kimi-k2.7-code` · `kimi-k2.6` · `deepseek-v4-pro` · `deepseek-v4-flash` · `mimo-v2.5` · `mimo-v2.5-pro` |
| `prompt` | string | 1–32768 chars                                                                                              |

### `POST /opencode/api`

Stateless chat-completion proxy. Caller supplies their own `api_key`.

| Field         | Type      | Constraints                                                                              |
|---------------|-----------|------------------------------------------------------------------------------------------|
| `model`       | enum      | same enum as `/opencode/agent`.                                                          |
| `messages`    | array     | `[{ role: "user"\|"assistant", content: string }, ...]`, each 1–32768.                   |
| `system`      | string?   | max 32768. Sent as `system` for Anthropic models, prepended otherwise.                   |
| `temperature` | number?   | 0–1 (default `0.7`).                                                                     |
| `max_tokens`  | number?   | 1–32768 (default `8192`).                                                                |
| `api_key`     | string    | required. Provider key.                                                                  |

### `POST /opencode/agent/md`

Write (or regenerate) the user's `AGENTS.md`.

| Field         | Type    | Constraints                                                                  |
|---------------|---------|------------------------------------------------------------------------------|
| `type`        | enum    | `"manual"` — write `prompt` verbatim. `"ai"` — generate from `prompt`.       |
| `prompt`      | string  | max 10000 chars.                                                             |
| `saveContext` | boolean | if `false`, the user's `context.md` is cleared after the write.              |

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

# raw chat completion
curl -X POST http://localhost:3000/opencode/api \
  -H "Content-Type: application/json" \
  -H "username: alice" -H "password: pa55w0rd" \
  -d '{"model":"qwen3.7-plus","messages":[{"role":"user","content":"hi"}],"api_key":"sk-xxx"}'
```

## Scripts & storage

`npm run` scripts: `init` · `start` · `typecheck` · `docker:up` · `docker:down` ·
`docker:logs` · `docker:restart` · `docker:build`.

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
