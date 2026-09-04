import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppHeader } from "@/components/app-header";
import { RequestyKeyProvider } from "@/components/requesty-key-provider";

vi.mock("next/navigation", () => ({ usePathname: () => "/chats" }));

describe("Requesty key control", () => {
  it("keeps the key in memory, masks it, and clears it", () => {
    render(<RequestyKeyProvider><AppHeader /></RequestyKeyProvider>);
    const input = screen.getByLabelText("Requesty key") as HTMLInputElement;
    expect(input.type).toBe("password");

    fireEvent.change(input, { target: { value: "sk-requesty-test" } });
    expect(screen.getByText("ready")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show API key" }));
    expect(input.type).toBe("text");
    fireEvent.click(screen.getByRole("button", { name: "Clear API key" }));
    expect(input.value).toBe("");
    expect(screen.getByText("not set")).toBeInTheDocument();
  });
});
