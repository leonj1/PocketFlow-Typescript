import { act, cleanup, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TranscriptRail } from "@/components/transcript-rail";
import type { OutlineGroup } from "@/lib/transcript-outline";
import { FakeIntersectionObservers } from "./fakes/intersection-observers";

const GROUPS: OutlineGroup[] = [
  {
    turnId: "t1",
    entries: [
      { messageId: "m1", label: "You", own: true },
      { messageId: "m2", label: "John Doe", own: false },
      { messageId: "m3", label: "Jane Smith", own: false },
    ],
  },
  {
    turnId: "t2",
    entries: [
      { messageId: "m4", label: "You", own: true },
      { messageId: "m5", label: "Mark Allen", own: false },
    ],
  },
];

function Harness({ groups }: { groups: OutlineGroup[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const messageIds = groups.flatMap((group) => group.entries.map((entry) => entry.messageId));
  return (
    <>
      <div className="transcript" ref={scrollRef}>
        {messageIds.map((messageId) => (
          <article key={messageId} data-message-id={messageId} />
        ))}
      </div>
      <TranscriptRail groups={groups} scrollRef={scrollRef} />
    </>
  );
}

function railLabels(): string[] {
  return screen.getAllByRole("button").map((button) => button.textContent ?? "");
}

function railEntry(label: string, index: number): HTMLElement {
  return screen.getAllByRole("button", { name: label })[index];
}

describe("transcript rail", () => {
  const observers = new FakeIntersectionObservers();
  const scrolled: { messageId: string; options: ScrollIntoViewOptions }[] = [];
  let restoreObservers: () => void = () => {};
  let originalScrollIntoView: typeof Element.prototype.scrollIntoView;

  beforeEach(() => {
    restoreObservers = observers.install();
    originalScrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function record(options?: boolean | ScrollIntoViewOptions) {
      scrolled.push({
        messageId: this.getAttribute("data-message-id") ?? "",
        options: options as ScrollIntoViewOptions,
      });
    };
  });

  afterEach(() => {
    cleanup();
    restoreObservers();
    Element.prototype.scrollIntoView = originalScrollIntoView;
    scrolled.splice(0, scrolled.length);
  });

  it("lists every outline entry in order and observes each message in the transcript", () => {
    render(<Harness groups={GROUPS} />);

    expect(railLabels()).toEqual(["You", "John Doe", "Jane Smith", "You", "Mark Allen"]);
    expect(observers.latest().observedMessageIds()).toEqual(["m1", "m2", "m3", "m4", "m5"]);
    expect(observers.latest().options?.root).toBe(document.querySelector(".transcript"));
  });

  it("marks the user's own entries and leaves agent entries unmarked", () => {
    render(<Harness groups={GROUPS} />);

    expect(railEntry("You", 0).className).toContain("own");
    expect(railEntry("You", 1).className).toContain("own");
    expect(railEntry("John Doe", 0).className).not.toContain("own");
    expect(railEntry("Mark Allen", 0).className).not.toContain("own");
  });

  it("highlights the topmost visible message as the transcript scrolls", () => {
    render(<Harness groups={GROUPS} />);

    act(() => observers.latest().report(["m3", "m4"]));
    expect(railEntry("Jane Smith", 0)).toHaveAttribute("aria-current", "true");
    expect(screen.getAllByRole("button").filter((button) => button.getAttribute("aria-current"))).toHaveLength(1);

    act(() => observers.latest().report(["m4", "m5"]));
    expect(railEntry("You", 1)).toHaveAttribute("aria-current", "true");
    expect(railEntry("Jane Smith", 0)).not.toHaveAttribute("aria-current");
  });

  it("highlights the last entry until the scroll-spy reports a visible message", () => {
    render(<Harness groups={GROUPS} />);

    expect(railEntry("Mark Allen", 0)).toHaveAttribute("aria-current", "true");
  });

  it("scrolls the chosen message to the top of the transcript when an entry is clicked", () => {
    render(<Harness groups={GROUPS} />);

    act(() => railEntry("John Doe", 0).click());

    expect(scrolled).toEqual([{ messageId: "m2", options: { block: "start", behavior: "smooth" } }]);
  });

  it("disconnects its observer when the rail unmounts", () => {
    const view = render(<Harness groups={GROUPS} />);
    const observer = observers.latest();

    view.unmount();

    expect(observer.isConnected).toBe(false);
    expect(observer.targets).toEqual([]);
  });
});
