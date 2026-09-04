"use client";

import { Archive, Bot, Check, LoaderCircle, Pencil, RefreshCw, X } from "lucide-react";
import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useRequestyKey } from "@/components/requesty-key-provider";
import type { Agent } from "@/lib/types";

type Fields = { name: string; description: string; model: string };
const EMPTY: Fields = { name: "", description: "", model: "openai/gpt-4o-mini" };

export function AgentManager({ initialAgents }: { initialAgents: Agent[] }) {
  const router = useRouter();
  const { apiKey } = useRequestyKey();
  const [agents, setAgents] = useState(initialAgents);
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [models, setModels] = useState<{ id: string; description: string }[]>([]);
  const [modelsBusy, setModelsBusy] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  function change<K extends keyof Fields>(key: K, value: Fields[K]) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  function reset() {
    setFields(EMPTY);
    setEditingId(null);
    setError("");
    nameRef.current?.focus();
  }

  function edit(agent: Agent) {
    setEditingId(agent.id);
    setFields({ name: agent.name, description: agent.description, model: agent.model });
    setError("");
    nameRef.current?.focus();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(editingId ? `/api/agents/${editingId}` : "/api/agents", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body.message ?? "Agent could not be saved.");
        nameRef.current?.focus();
        return;
      }
      setAgents((current) => editingId
        ? current.map((agent) => agent.id === editingId ? body.agent : agent)
        : [body.agent, ...current]);
      reset();
      router.refresh();
    } catch {
      setError("Agent could not be saved. Check the server connection and try again.");
      nameRef.current?.focus();
    } finally {
      setBusy(false);
    }
  }

  async function archive(agent: Agent) {
    if (!window.confirm(`Archive ${agent.name}? It will be removed from active rooms.`)) return;
    const response = await fetch(`/api/agents/${agent.id}`, { method: "DELETE" });
    if (!response.ok) return setError("Agent could not be archived.");
    setAgents((current) => current.filter((item) => item.id !== agent.id));
    if (editingId === agent.id) reset();
    router.refresh();
  }

  async function loadModels() {
    if (!apiKey) return setError("Enter your Requesty key in the header to load approved models.");
    setModelsBusy(true);
    setError("");
    const response = await fetch("/api/requesty/models", { headers: { "X-Requesty-Key": apiKey } });
    const body = await response.json();
    setModelsBusy(false);
    if (!response.ok) return setError(body.message ?? "Models could not be loaded.");
    setModels(body.models);
  }

  return (
    <div className="agents-page">
      <section className="agent-form-panel" aria-labelledby="agent-form-title">
        <h1 id="agent-form-title">{editingId ? "Refine the brief." : "Create a specialist."}</h1>
        <p className="section-intro">The description becomes this agent’s system prompt. Give it a distinct responsibility so the panel knows when its voice matters.</p>
        <form className="agent-form" onSubmit={submit} autoComplete="off">
          <label htmlFor="agent-name">Name</label>
          <input ref={nameRef} id="agent-name" value={fields.name} onChange={(event) => change("name", event.target.value)} placeholder="Evidence checker" maxLength={80} required />

          <label htmlFor="agent-description">Description / system prompt</label>
          <textarea id="agent-description" value={fields.description} onChange={(event) => change("description", event.target.value)} placeholder="Check claims against the available evidence. Correct consequential errors and pass when the answer is already sound." rows={8} maxLength={8000} required />

          <div className="label-row">
            <label htmlFor="agent-model">Requesty model</label>
            <button className="text-button" type="button" onClick={loadModels} disabled={modelsBusy}>
              <RefreshCw size={14} className={modelsBusy ? "spin" : ""} />
              {modelsBusy ? "Loading" : "Load approved models"}
            </button>
          </div>
          <input id="agent-model" list="requesty-models" value={fields.model} onChange={(event) => change("model", event.target.value)} placeholder="provider/model" required />
          <datalist id="requesty-models">{models.map((model) => <option key={model.id} value={model.id}>{model.description}</option>)}</datalist>

          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="form-actions">
            <button className="primary-button" type="submit" disabled={busy}>
              {busy ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />}
              {editingId ? "Save changes" : "Create agent"}
            </button>
            {editingId && <button className="secondary-button" type="button" onClick={reset}><X size={16} />Cancel</button>}
          </div>
        </form>
      </section>

      <section className="agent-register" aria-labelledby="agent-register-title">
        <header className="register-heading">
          <div><h2 id="agent-register-title">Agent register</h2><p>{agents.length} available for rooms</p></div>
          <span className="register-seal"><Bot size={20} />{agents.length}</span>
        </header>
        {agents.length === 0 ? (
          <div className="register-empty"><Bot size={28} /><h3>No specialists yet</h3><p>Define the first agent on the left. It will become available in every room.</p></div>
        ) : (
          <div className="agent-rows">
            {agents.map((agent, index) => (
              <article className="agent-register-row" key={agent.id}>
                <span className="specimen-number">{String(index + 1).padStart(2, "0")}</span>
                <div className="agent-copy">
                  <div className="agent-title-line"><h3>{agent.name}</h3><code>{agent.model}</code></div>
                  <p>{agent.description}</p>
                </div>
                <div className="row-actions">
                  <button className="icon-button" type="button" onClick={() => edit(agent)} aria-label={`Edit ${agent.name}`}><Pencil size={16} /></button>
                  <button className="icon-button danger" type="button" onClick={() => archive(agent)} aria-label={`Archive ${agent.name}`}><Archive size={16} /></button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
