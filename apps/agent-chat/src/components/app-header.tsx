"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Eye, EyeOff, FlaskConical, KeyRound, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { useRequestyKey } from "@/components/requesty-key-provider";

export function AppHeader() {
  const pathname = usePathname();
  const { apiKey, setApiKey, clearApiKey } = useRequestyKey();
  const [visible, setVisible] = useState(false);
  const inputId = useId();

  return (
    <header className="app-header">
      <Link className="brand" href="/chats" aria-label="PocketFlow Rooms home">
        <span className="brand-mark" aria-hidden="true"><FlaskConical size={20} strokeWidth={2.2} /></span>
        <span>PocketFlow <strong>Rooms</strong></span>
      </Link>
      <nav className="primary-nav" aria-label="Primary navigation">
        <Link className={pathname.startsWith("/chats") ? "active" : ""} href="/chats" aria-current={pathname.startsWith("/chats") ? "page" : undefined}>Chats</Link>
        <Link className={pathname.startsWith("/agents") ? "active" : ""} href="/agents" aria-current={pathname.startsWith("/agents") ? "page" : undefined}>Agents</Link>
      </nav>
      <div className="key-control" data-connected={Boolean(apiKey)}>
        <label htmlFor={inputId}>
          <KeyRound size={15} aria-hidden="true" />
          <span className="key-label">Requesty key</span>
        </label>
        <input
          id={inputId}
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          type={visible ? "text" : "password"}
          autoComplete="off"
          spellCheck={false}
          placeholder="sk-requesty…"
          aria-describedby={`${inputId}-status`}
        />
        <button className="icon-button" type="button" onClick={() => setVisible((value) => !value)} aria-label={visible ? "Hide API key" : "Show API key"}>
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
        {apiKey && (
          <button className="icon-button danger" type="button" onClick={clearApiKey} aria-label="Clear API key">
            <Trash2 size={15} />
          </button>
        )}
        <span className="key-status" id={`${inputId}-status`}>{apiKey ? "ready" : "not set"}</span>
      </div>
    </header>
  );
}
