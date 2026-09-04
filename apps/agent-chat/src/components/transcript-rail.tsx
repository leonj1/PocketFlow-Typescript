"use client";

import { RefObject, useEffect, useMemo, useState } from "react";
import { outlineMessageIds, type OutlineEntry, type OutlineGroup } from "@/lib/transcript-outline";

const ACTIVE_BAND = "-14% 0px -66% 0px";

function messageElement(root: HTMLElement, messageId: string) {
  return root.querySelector(`[data-message-id="${messageId}"]`);
}

function nextVisible(current: ReadonlySet<string>, entries: readonly IntersectionObserverEntry[]): Set<string> {
  const updated = new Set(current);
  for (const entry of entries) {
    const messageId = entry.target.getAttribute("data-message-id") ?? "";
    if (entry.isIntersecting) updated.add(messageId);
    else updated.delete(messageId);
  }
  return updated;
}

function observeMessages(observer: IntersectionObserver, root: HTMLElement, messageIds: readonly string[]) {
  for (const messageId of messageIds) {
    const element = messageElement(root, messageId);
    if (element) observer.observe(element);
  }
}

function useActiveMessage(scrollRef: RefObject<HTMLElement | null>, messageIds: readonly string[]): string {
  const [spied, setSpied] = useState("");

  useEffect(() => {
    const root = scrollRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    let visible: ReadonlySet<string> = new Set<string>();
    const observer = new IntersectionObserver((entries) => {
      visible = nextVisible(visible, entries);
      const topmost = messageIds.find((messageId) => visible.has(messageId));
      if (topmost) setSpied(topmost);
    }, { root, rootMargin: ACTIVE_BAND, threshold: 0 });
    observeMessages(observer, root, messageIds);
    return () => observer.disconnect();
  }, [scrollRef, messageIds]);

  return messageIds.includes(spied) ? spied : messageIds.at(-1) ?? "";
}

function RailEntry({ entry, active, onSelect }: { entry: OutlineEntry; active: boolean; onSelect: (messageId: string) => void }) {
  const flags = `rail-entry${entry.own ? " own" : ""}${active ? " active" : ""}`;
  return (
    <li>
      <button type="button" className={flags} aria-current={active ? "true" : undefined} onClick={() => onSelect(entry.messageId)}>
        <span className="rail-mark" aria-hidden="true" />
        <span className="rail-label">{entry.label}</span>
      </button>
    </li>
  );
}

export function TranscriptRail({ groups, scrollRef }: { groups: OutlineGroup[]; scrollRef: RefObject<HTMLDivElement | null> }) {
  const messageIds = useMemo(() => outlineMessageIds(groups), [groups]);
  const activeId = useActiveMessage(scrollRef, messageIds);

  function jump(messageId: string) {
    const root = scrollRef.current;
    if (!root) return;
    messageElement(root, messageId)?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  return (
    <nav className="transcript-rail" aria-label="Transcript outline">
      <p className="rail-title">Transcript</p>
      <ol className="rail-list">
        {groups.map((group) => (
          <li key={group.turnId} className="rail-group">
            <ol>
              {group.entries.map((entry) => (
                <RailEntry key={entry.messageId} entry={entry} active={entry.messageId === activeId} onSelect={jump} />
              ))}
            </ol>
          </li>
        ))}
      </ol>
    </nav>
  );
}
