type IntersectionCallback = (entries: IntersectionObserverEntry[]) => void;

export class FakeObserver {
  readonly targets: Element[] = [];
  readonly options: IntersectionObserverInit | undefined;
  private readonly callback: IntersectionCallback;
  private connected = true;

  constructor(callback: IntersectionCallback, options?: IntersectionObserverInit) {
    this.callback = callback;
    this.options = options;
  }

  observe(target: Element) {
    this.targets.push(target);
  }

  unobserve(target: Element) {
    const at = this.targets.indexOf(target);
    if (at >= 0) this.targets.splice(at, 1);
  }

  disconnect() {
    this.targets.splice(0, this.targets.length);
    this.connected = false;
  }

  get isConnected() {
    return this.connected;
  }

  observedMessageIds(): string[] {
    return this.targets.map((target) => target.getAttribute("data-message-id") ?? "");
  }

  report(visibleMessageIds: readonly string[]) {
    const entries = this.targets.map((target) => ({
      target,
      isIntersecting: visibleMessageIds.includes(target.getAttribute("data-message-id") ?? ""),
    }));
    this.callback(entries as unknown as IntersectionObserverEntry[]);
  }
}

export class FakeIntersectionObservers {
  readonly created: FakeObserver[] = [];

  install(): () => void {
    const original = globalThis.IntersectionObserver;
    const created = this.created;
    globalThis.IntersectionObserver = class extends FakeObserver {
      constructor(callback: IntersectionCallback, options?: IntersectionObserverInit) {
        super(callback, options);
        created.push(this);
      }
    } as unknown as typeof IntersectionObserver;
    return () => {
      globalThis.IntersectionObserver = original;
      this.created.splice(0, this.created.length);
    };
  }

  latest(): FakeObserver {
    const observer = this.created.at(-1);
    if (!observer) throw new Error("No IntersectionObserver was created.");
    return observer;
  }
}
