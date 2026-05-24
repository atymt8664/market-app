# P5 — Messaging & Realtime Chat

| Field | Value |
|-------|-------|
| **Code** | P5 |
| **Status** | Active |

---

## الهدف / Goal

Buyer–seller **conversations**: threads, messages, read state, attachments, location messages, typing indicators, delete-for-everyone, and WebSocket realtime delivery.

---

## المسؤوليات / Responsibilities

- Conversations REST API
- WebSocket server (`realtime.ts`) attached to HTTP server
- Message types and chat privacy rules
- In-app notifications triggered from chat events (hand off fan-out to **P15** later)
- Frontend inbox and thread UI, socket context

---

## الملفات التابعة / Owned paths

| Layer | Paths |
|-------|-------|
| API | `routes/conversations.ts`, `lib/realtime.ts`, `lib/chat-location-message.ts` |
| Schema | `lib/db/src/schema/messages.ts`, `chat-privacy.ts`, migration `015_phase8_message_deleted_for_everyone.sql` |
| Frontend | `pages/messages.tsx`, `message-thread.tsx`, `contexts/chat-socket-context.tsx`, `components/chat-*` |
| Lib | `lib/chat-delete-for-everyone.ts`, `lib/chat-message-copy.ts`, `lib/inbox-conversation-cache.ts`, `lib/build-ws-url.ts` |
| i18n (target) | `p5.chat.*` (legacy: `message_thread.*`, etc.) |

---

## ما المسموح تعديله / Allowed changes

- Message schema (migrations with **P7** if abuse-related)
- WS protocol extensions (version carefully)
- Chat UI/UX

---

## ما الممنوع تعديله / Forbidden changes

- Ad listing business rules (**P4**)
- Session/auth core (**P2**)
- Redis adapter (**P16**) without STAGING spike approval

---

## Boundaries

- References `adId` and user ids — does not mutate ad rows
- Blocks enforced via **P7** `user-blocks`

---

## Dependencies

| Depends on | Reason |
|------------|--------|
| **P2** | WS auth via session cookie |
| **P4** | Ad context |
| **P7** | Blocks |
| **P16** | Horizontal WS (future) |
| **P15** | Notification fan-out (future) |

---

## Owner scope

- **Primary:** **Developer B**

---

## Scalability notes

- **Current bottleneck:** in-process `userSockets` Map — single API instance only
- Target: Redis pub/sub + multiple API replicas (**P16**)
- 1M messages/day requires **P15** queue for side effects

---

## Future roadmap

- WS Redis adapter on STAGING
- Split `message-thread.tsx` (~1900 lines)
- Spam detection hooks (**P7** / **P12**)

---

## Testing requirements

- `pnpm --filter @workspace/souq run test:ws-url`
- STAGING: send message, WS receive, typing, delete-for-everyone
- `phase5-ws-probe.sh` (**P0** script, **P5** domain)

---

## Security notes

- WS auth must match HTTP session
- Respect `eitherUserBlocksTheOther` before delivery
- No message content in production logs

---

## Related legacy phase paths

| Legacy | Note |
|--------|------|
| `phase3-production-ws-probe.sh`, `phase5-ws-probe.sh` | WS connectivity |
| `015_phase8_message_deleted_for_everyone.sql` | Message feature |

---

## i18n namespace

**Target:** `p5.chat.*`
