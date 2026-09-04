"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageSquareText, Plus, Radio } from "lucide-react";
import { FormEvent, useState } from "react";
import type { ChatSummary } from "@/lib/types";

export function ChatList({ chats, activeId }: { chats: ChatSummary[]; activeId?: string }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");

  async function create(event: FormEvent) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    const body = await response.json();
    if (!response.ok) return setError(body.message ?? "Room could not be created.");
    setTitle("");
    setCreating(false);
    router.push(`/chats/${body.chat.id}`);
    router.refresh();
  }

  return (
    <section className="pane chat-list-pane" aria-label="Previous chats">
      <div className="pane-heading">
        <div>
          <h2>Rooms</h2>
          <p>{chats.length} recorded</p>
        </div>
        <button className="icon-button strong" type="button" onClick={() => setCreating((value) => !value)} aria-label="Create chat room">
          <Plus size={18} />
        </button>
      </div>
      {creating && (
        <form className="compact-form" onSubmit={create}>
          <label htmlFor="new-room-title">Room name</label>
          <div className="inline-field">
            <input id="new-room-title" autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Research review" />
            <button type="submit" disabled={!title.trim()}>Create</button>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
        </form>
      )}
      <div className="chat-index">
        {chats.length === 0 ? (
          <div className="empty-note">
            <MessageSquareText size={22} />
            <p>No rooms yet. Create one to assemble an agent panel.</p>
          </div>
        ) : chats.map((chat) => (
          <Link key={chat.id} href={`/chats/${chat.id}`} className={chat.id === activeId ? "chat-row active" : "chat-row"}>
            <Radio size={14} aria-hidden="true" />
            <span>
              <strong>{chat.title}</strong>
              <small>{chat.messageCount} {chat.messageCount === 1 ? "message" : "messages"}</small>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
