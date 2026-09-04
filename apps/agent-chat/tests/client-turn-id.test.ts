import { describe, expect, it, vi } from "vitest";
import { createClientTurnId } from "@/lib/client-turn-id";

describe("client turn IDs", () => {
  it("uses randomUUID when the browser exposes it", () => {
    const randomUUID = vi.fn(() => "6996ce89-b6be-49fc-b88e-0a6dfb87b08c" as `${string}-${string}-${string}-${string}-${string}`);
    const cryptoApi = { randomUUID } as unknown as Crypto;

    expect(createClientTurnId(cryptoApi)).toBe("6996ce89-b6be-49fc-b88e-0a6dfb87b08c");
    expect(randomUUID).toHaveBeenCalledOnce();
  });

  it("creates a valid UUID v4 when randomUUID is unavailable", () => {
    const getRandomValues = vi.fn((bytes: Uint8Array) => {
      bytes.set([0x10, 0x32, 0x54, 0x76, 0x98, 0xba, 0xdc, 0xfe, 0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef]);
      return bytes;
    });
    const cryptoApi = { getRandomValues } as unknown as Crypto;

    const id = createClientTurnId(cryptoApi);

    expect(id).toBe("10325476-98ba-4cfe-8123-456789abcdef");
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(getRandomValues).toHaveBeenCalledOnce();
  });
});
