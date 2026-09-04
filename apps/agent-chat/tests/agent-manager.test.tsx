import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentManager } from "@/components/agent-manager";
import { RequestyKeyProvider } from "@/components/requesty-key-provider";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

describe("agent creation form", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    refresh.mockReset();
  });

  it("creates an agent and adds it to the agent register", async () => {
    const createdAgent = {
      id: "b6cffd6f-c9ea-4837-bc5e-fbd9b46ed014",
      name: "Evidence checker",
      description: "Check consequential factual claims.",
      model: "openai/gpt-4o-mini",
      createdAt: "2026-09-04T00:00:00.000Z",
      updatedAt: "2026-09-04T00:00:00.000Z",
      archivedAt: null,
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ agent: createdAgent }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <RequestyKeyProvider>
        <AgentManager initialAgents={[]} />
      </RequestyKeyProvider>,
    );

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: createdAgent.name } });
    fireEvent.change(screen.getByLabelText("Description / system prompt"), {
      target: { value: createdAgent.description },
    });
    fireEvent.change(screen.getByLabelText("Requesty model"), { target: { value: createdAgent.model } });
    fireEvent.click(screen.getByRole("button", { name: "Create agent" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith("/api/agents", expect.objectContaining({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: createdAgent.name,
        description: createdAgent.description,
        model: createdAgent.model,
      }),
    }));
    expect(await screen.findByRole("heading", { name: createdAgent.name })).toBeInTheDocument();
    expect(screen.queryByText("No specialists yet")).not.toBeInTheDocument();
    expect(screen.getByText("1 available for rooms")).toBeInTheDocument();
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("shows a useful error when the create request cannot be completed", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    render(
      <RequestyKeyProvider>
        <AgentManager initialAgents={[]} />
      </RequestyKeyProvider>,
    );

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Evidence checker" } });
    fireEvent.change(screen.getByLabelText("Description / system prompt"), {
      target: { value: "Check consequential factual claims." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create agent" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Agent could not be saved. Check the server connection and try again.",
    );
  });
});
