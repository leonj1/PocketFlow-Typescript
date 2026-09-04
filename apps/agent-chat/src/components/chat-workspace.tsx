"use client";

import {
  ArrowDown,
  ArrowUp,
  Bot,
  Check,
  ChevronDown,
  CircleAlert,
  Clock3,
  FlaskConical,
  Menu,
  MessageSquareText,
  Pencil,
  Plus,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { FormEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatList } from "@/components/chat-list";
import { useRequestyKey } from "@/components/requesty-key-provider";
import { createClientTurnId } from "@/lib/client-turn-id";
import { CHAT_MESSAGE_MAX_CHARACTERS } from "@/lib/limits";
import type { Agent, ChatDetail, ChatSummary, EvaluationStatus } from "@/lib/types";

type RunState = Record<string, EvaluationStatus | "queued">;
type RunErrors = Record<string, string | null>;

function time(value: string) {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function evaluationLabel(state: RunState[string] | undefined, errorCode: string | null | undefined) {
  if (!state) return "ready";
  if (state === "abstained") return "passed";
  if (state === "failed" && errorCode) return `failed · ${errorCode.replaceAll("_", " ")}`;
  return state;
}

export function ChatWorkspace({ initialChat, chats, agents }: { initialChat: ChatDetail; chats: ChatSummary[]; agents: Agent[] }) {
  const router = useRouter();
  const { apiKey } = useRequestyKey();
  const [chat, setChat] = useState(initialChat);
  const [content, setContent] = useState("");
  const [optimisticContent, setOptimisticContent] = useState("");
  const [running, setRunning] = useState(false);
  const [runState, setRunState] = useState<RunState>({});
  const [runErrors, setRunErrors] = useState<RunErrors>({});
  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState("");
  const [mobilePane, setMobilePane] = useState<"chats" | "conversation" | "agents">("conversation");
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(chat.title);
  const [selectedAgent, setSelectedAgent] = useState("");
  const transcriptEnd = useRef<HTMLDivElement>(null);

  const invitedIds = useMemo(() => new Set(chat.roomAgents.map((agent) => agent.id)), [chat.roomAgents]);
  const availableAgents = agents.filter((agent) => !invitedIds.has(agent.id));
  const latestRunState = useMemo<RunState>(() => Object.fromEntries(
    (chat.turns.at(-1)?.evaluations ?? []).map((evaluation) => [evaluation.agentId, evaluation.status]),
  ), [chat.turns]);
  const latestRunErrors = useMemo<RunErrors>(() => Object.fromEntries(
    (chat.turns.at(-1)?.evaluations ?? []).map((evaluation) => [evaluation.agentId, evaluation.errorCode]),
  ), [chat.turns]);

  async function saveMembership(agentIds: string[]) {
    setError("");
    const response = await fetch(`/api/chats/${chat.id}/agents`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentIds }),
    });
    const body = await response.json();
    if (!response.ok) return setError(body.message ?? "The panel could not be updated.");
    setChat((current) => ({ ...current, roomAgents: body.agents }));
    setSelectedAgent("");
    router.refresh();
  }

  function move(agentId: string, direction: -1 | 1) {
    const ids = chat.roomAgents.map((agent) => agent.id);
    const from = ids.indexOf(agentId);
    const to = from + direction;
    if (to < 0 || to >= ids.length) return;
    [ids[from], ids[to]] = [ids[to], ids[from]];
    void saveMembership(ids);
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    const message = content.trim();
    if (!message || running) return;
    if (chat.roomAgents.length && !apiKey) {
      setError("Enter your Requesty API key in the header before running the panel.");
      return;
    }
    setError("");
    setRunning(true);
    setOptimisticContent(message);
    setContent("");
    setRunState(Object.fromEntries(chat.roomAgents.map((agent) => [agent.id, "queued"])));
    setRunErrors({});
    setStatusText(chat.roomAgents.length ? `${chat.roomAgents.length} agents queued.` : "Saving message.");
    try {
      const response = await fetch(`/api/chats/${chat.id}/turns`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/x-ndjson",
          ...(apiKey ? { "X-Requesty-Key": apiKey } : {}),
        },
        body: JSON.stringify({ content: message, clientTurnId: createClientTurnId() }),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.message ?? "The turn could not be started.");
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error("The progress stream was unavailable.");
      const decoder = new TextDecoder();
      let buffered = "";
      while (true) {
        const { value, done } = await reader.read();
        buffered += decoder.decode(value ?? new Uint8Array(), { stream: !done });
        const lines = buffered.split("\n");
        buffered = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const update = JSON.parse(line) as {
            type: string;
            agentId?: string;
            agentName?: string;
            status?: EvaluationStatus;
            errorCode?: string | null;
            chat?: ChatDetail;
          };
          if (update.type === "agent.started" && update.agentId) {
            setRunState((current) => ({ ...current, [update.agentId!]: "running" }));
            setStatusText(`${update.agentName} is evaluating the message.`);
          }
          if (update.type === "agent.completed" && update.agentId && update.status) {
            setRunState((current) => ({ ...current, [update.agentId!]: update.status! }));
            setRunErrors((current) => ({ ...current, [update.agentId!]: update.errorCode ?? null }));
            const verb = update.status === "responded" ? "contributed" : update.status === "abstained" ? "passed" : "failed";
            const detail = update.status === "failed" && update.errorCode ? ` (${update.errorCode.replaceAll("_", " ")})` : "";
            setStatusText(`${update.agentName} ${verb}${detail}.`);
          }
          if (update.type === "turn.snapshot" && update.chat) setChat(update.chat);
        }
        if (done) break;
      }
      setStatusText("Panel run complete.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The turn did not complete.");
      setStatusText("Panel run stopped.");
      router.refresh();
    } finally {
      setRunning(false);
      setOptimisticContent("");
      window.setTimeout(() => transcriptEnd.current?.scrollIntoView({ behavior: "smooth" }), 0);
    }
  }

  async function rename(event: FormEvent) {
    event.preventDefault();
    const response = await fetch(`/api/chats/${chat.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    const body = await response.json();
    if (!response.ok) return setError(body.message ?? "Room could not be renamed.");
    setChat(body.chat);
    setEditingTitle(false);
    router.refresh();
  }

  async function removeRoom() {
    if (!window.confirm(`Delete ${chat.title} and its transcript?`)) return;
    const response = await fetch(`/api/chats/${chat.id}`, { method: "DELETE" });
    if (!response.ok) return setError("Room could not be deleted.");
    router.push("/chats");
    router.refresh();
  }

  return (
    <div className="workspace-wrap">
      <nav className="mobile-pane-nav" aria-label="Chat workspace panes">
        <button aria-pressed={mobilePane === "chats"} className={mobilePane === "chats" ? "active" : ""} onClick={() => setMobilePane("chats")}><Menu size={16} />Chats</button>
        <button aria-pressed={mobilePane === "conversation"} className={mobilePane === "conversation" ? "active" : ""} onClick={() => setMobilePane("conversation")}><MessageSquareText size={16} />Conversation</button>
        <button aria-pressed={mobilePane === "agents"} className={mobilePane === "agents" ? "active" : ""} onClick={() => setMobilePane("agents")}><Bot size={16} />Agents</button>
      </nav>
      <div className="workspace-grid">
        <div className={mobilePane === "chats" ? "mobile-active" : "mobile-hidden"}><ChatList chats={chats} activeId={chat.id} /></div>

        <section className={`conversation-pane ${mobilePane === "conversation" ? "mobile-active" : "mobile-hidden"}`} aria-label="Current chat">
          <header className="conversation-heading">
            <div className="title-block">
              {editingTitle ? (
                <form className="rename-form" onSubmit={rename}>
                  <input value={title} onChange={(event) => setTitle(event.target.value)} aria-label="Room name" autoFocus />
                  <button className="icon-button strong" aria-label="Save room name"><Check size={16} /></button>
                  <button className="icon-button" type="button" onClick={() => setEditingTitle(false)} aria-label="Cancel rename"><X size={16} /></button>
                </form>
              ) : (
                <div className="room-title"><h1>{chat.title}</h1><button className="icon-button" type="button" onClick={() => setEditingTitle(true)} aria-label="Rename room"><Pencil size={15} /></button></div>
              )}
              <p>{chat.roomAgents.length ? `${chat.roomAgents.length}-agent sequential panel` : "No agents invited yet"}</p>
            </div>
            <button className="icon-button danger" type="button" onClick={removeRoom} aria-label="Delete room"><Trash2 size={16} /></button>
          </header>

          <div className="transcript" aria-live="polite">
            {chat.messages.length === 0 && !optimisticContent ? (
              <div className="conversation-empty">
                <FlaskConical size={32} />
                <h2>The bench is ready.</h2>
                <p>{chat.roomAgents.length ? "Submit a prompt. Each specialist will inspect it in the order shown." : "Invite agents from the panel before starting, or save a note without them."}</p>
              </div>
            ) : chat.messages.map((message) => (
              <article key={message.id} className={`message-entry ${message.role}`}>
                <div className="message-meta">
                  <span>{message.role === "user" ? "You" : message.agentName ?? "Agent"}</span>
                  <time dateTime={message.createdAt}>{time(message.createdAt)}</time>
                </div>
                <p>{message.content}</p>
              </article>
            ))}
            {optimisticContent && (
              <article className="message-entry user pending">
                <div className="message-meta"><span>You</span><span>sending</span></div>
                <p>{optimisticContent}</p>
              </article>
            )}
            <div ref={transcriptEnd} />
          </div>

          <form className="composer" onSubmit={send}>
            <label htmlFor="chat-message">Message the room</label>
            <div className="composer-row">
              <textarea id="chat-message" value={content} onChange={(event) => setContent(event.target.value)} placeholder="Ask for analysis, critique, or a decision…" rows={2} maxLength={CHAT_MESSAGE_MAX_CHARACTERS} disabled={running} onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); }
              }} />
              <button className="send-button" type="submit" disabled={running || !content.trim()}>
                {running ? <Clock3 className="spin" size={18} /> : <Send size={18} />}
                <span>{running ? "Running" : "Send"}</span>
              </button>
            </div>
            <div className="composer-status">
              <span aria-live="polite">{statusText || "Enter sends · Shift+Enter adds a line"}</span>
              <span>{content.length}/{CHAT_MESSAGE_MAX_CHARACTERS}</span>
            </div>
            {error && <p className="form-error" role="alert"><CircleAlert size={15} />{error}</p>}
          </form>
        </section>

        <aside className={`pane roster-pane ${mobilePane === "agents" ? "mobile-active" : "mobile-hidden"}`} aria-label="Agents in chat">
          <div className="pane-heading">
            <div><h2>Panel sequence</h2><p>Earlier voices inform later ones</p></div>
            <span className="sequence-count">{chat.roomAgents.length}</span>
          </div>
          <div className="invite-control">
            <label htmlFor="invite-agent">Invite an agent</label>
            <div className="select-wrap">
              <select id="invite-agent" value={selectedAgent} onChange={(event) => setSelectedAgent(event.target.value)} disabled={running || availableAgents.length === 0}>
                <option value="">{availableAgents.length ? "Choose specialist" : "All agents invited"}</option>
                {availableAgents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
              </select>
              <ChevronDown size={15} aria-hidden="true" />
              <button type="button" className="icon-button strong" disabled={!selectedAgent || running} onClick={() => saveMembership([...chat.roomAgents.map((agent) => agent.id), selectedAgent])} aria-label="Invite selected agent"><Plus size={17} /></button>
            </div>
          </div>
          <div className="agent-sequence">
            {chat.roomAgents.length === 0 ? (
              <div className="empty-note"><Bot size={22} /><p>No agents in this room. Invite one above.</p></div>
            ) : chat.roomAgents.map((agent, index) => {
              const state = runState[agent.id] ?? latestRunState[agent.id];
              const errorCode = runErrors[agent.id] ?? latestRunErrors[agent.id];
              return (
                <article className={`sequence-row state-${state ?? "idle"}`} key={agent.id}>
                  <div className="sequence-rail"><span>{index + 1}</span>{index < chat.roomAgents.length - 1 && <i />}</div>
                  <div className="sequence-copy"><strong>{agent.name}</strong><code>{agent.model}</code><small>{evaluationLabel(state, errorCode)}</small></div>
                  <div className="sequence-actions">
                    <button className="icon-button" type="button" onClick={() => move(agent.id, -1)} disabled={running || index === 0} aria-label={`Move ${agent.name} earlier`}><ArrowUp size={14} /></button>
                    <button className="icon-button" type="button" onClick={() => move(agent.id, 1)} disabled={running || index === chat.roomAgents.length - 1} aria-label={`Move ${agent.name} later`}><ArrowDown size={14} /></button>
                    <button className="icon-button danger" type="button" onClick={() => saveMembership(chat.roomAgents.filter((item) => item.id !== agent.id).map((item) => item.id))} disabled={running} aria-label={`Remove ${agent.name} from room`}><X size={14} /></button>
                  </div>
                </article>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}
