"use client";

import { ArrowLeftRight, FlaskConical, MessagesSquare } from "lucide-react";
import type { Agent, ChatSummary } from "@/lib/types";
import { ChatList } from "@/components/chat-list";

export function ChatLobby({ chats, agents }: { chats: ChatSummary[]; agents: Agent[] }) {
  return (
    <div className="workspace-grid lobby-grid">
      <ChatList chats={chats} />
      <section className="conversation-pane lobby" aria-label="Current chat">
        <div className="lobby-instrument" aria-hidden="true">
          <span /><FlaskConical size={42} /><span />
        </div>
        <h1>Assemble a room,<br />then run the panel.</h1>
        <p>Each agent reads the same prompt in sequence. It contributes only when it can add something the room has not already said.</p>
        <div className="process-line" aria-label="How a turn works">
          <span><MessagesSquare size={17} />Prompt</span>
          <ArrowLeftRight size={17} />
          <span>{agents.length || "No"} agents available</span>
        </div>
      </section>
      <aside className="pane roster-pane muted" aria-label="Agents in chat">
        <div className="pane-heading"><div><h2>Panel</h2><p>Awaiting a room</p></div></div>
        <p className="aside-copy">Select a previous room or create a new one, then invite agents here.</p>
      </aside>
    </div>
  );
}
