# PocketFlow Rooms

A full-stack Next.js application for running an ordered panel of PocketFlow agents through Requesty.

## How turns work

Each room has an ordered list of agents. When the user submits a message, the server snapshots that order and runs one PocketFlow `Node` per agent through a `Flow`:

1. The first agent receives its system prompt, prior transcript, and the current user message.
2. Each later agent also receives meaningful responses from earlier agents in the same turn.
3. Every agent returns either `respond` or `abstain`. Abstentions are recorded but remain out of the transcript and later context.
4. An agent failure is sanitized and recorded; the remaining agents still run.

The browser receives newline-delimited progress events as the panel advances.

## Local setup

From the repository root:

```bash
npm install
npm run build
cd apps/agent-chat
npm install
npm run dev
```

Open `http://localhost:3000`. The development server binds to `0.0.0.0`.

SQLite is initialized automatically. By default its file is `.data/agent-chat.db`; override it with `DATABASE_PATH` from `.env.local` if needed.

## Requesty credentials

Paste a Requesty API key into the masked control in the top header. The key lives only in React memory and is sent to same-origin model and turn endpoints using `X-Requesty-Key`. The backend forwards it to Requesty for that request only. It is never written to SQLite, cookies, browser storage, URLs, analytics, or application logs. Refreshing the page clears it.

Agent model IDs use Requesty's `provider/model` form, such as `openai/gpt-4o-mini`. The Agents page can load the models approved for the supplied key.

## Commands

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Server tests use temporary in-memory SQLite databases and fake gateways; tests never call Requesty.

## Routes

- `/chats` — create or select rooms.
- `/chats/[chatId]` — three-pane room workspace.
- `/agents` — create, edit, archive, and inspect agents.

## Deployment boundary

This initial implementation assumes one user in a local or otherwise trusted environment. Before public deployment, add authentication, ownership checks, CSRF protections appropriate to the deployment, hosted PostgreSQL, and explicit rate/cost limits. A serverless target also needs durable database storage and a request-duration strategy suitable for sequential model calls.
