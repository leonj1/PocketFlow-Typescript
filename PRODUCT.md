# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js App Router with TypeScript, using PocketFlow's local `Node` and `Flow` abstractions for sequential agent orchestration. The application lives in an isolated private package under `apps/agent-chat` so the published library stays dependency-free.

## Users

People who want several purpose-built LLM perspectives in one conversation and need to see which agent contributed, passed, or failed. This is inferred from the supplied implementation brief.

## Product Purpose

The product lets a user create reusable agents, invite an ordered set into a chat room, and submit one prompt that each agent evaluates in sequence. Success means agents add only meaningful new information while later agents can incorporate earlier contributions without repeating them.

## Positioning

Unlike a parallel panel or a conventional single-assistant chat, every room is an ordered editorial chain: each agent sees what earlier agents contributed and may deliberately pass when it has nothing significant to add.

## Operating Context

The main workspace has a persistent provider-key control, previous chats at left, the live transcript and composer in the center, and the room's ordered agents at right. Agent management is a separate route. The initial deployment context is assumed to be local or otherwise trusted.

## Capabilities and Constraints

- Agents have a name, a description that serves as their system prompt, and a Requesty `provider/model` identifier.
- A turn snapshots room membership and evaluates agents strictly one at a time.
- Only meaningful responses enter the visible transcript and later-agent context; abstentions remain evaluation metadata.
- Individual provider failures do not prevent later agents from evaluating the prompt.
- The Requesty token is supplied in the top header, held in browser memory, sent only to the same-origin backend, and never persisted or logged.
- Chats, messages, agents, membership, turns, and evaluation outcomes persist locally.
- Authentication, tenant isolation, and an internet-facing deployment target remain open decisions.

## Evidence on Hand

The repository contains the PocketFlow TypeScript implementation and tests, including a multi-agent pattern example. No logo, visual identity, customer evidence, commercial claims, or production hosting configuration was supplied.

## Product Principles

- Add signal, not agreement for agreement's sake.
- Make the order and state of agent evaluation legible.
- Preserve user control over room membership, model choice, and credentials.
- Keep failures recoverable and secrets ephemeral.
- Protect the small, dependency-light PocketFlow library from application concerns.

## Accessibility & Inclusion

All core workflows must be keyboard-operable, expose clear focus states and semantic landmarks, announce asynchronous agent status, and remain usable on narrow screens without compressing three panes into an unreadable layout.
