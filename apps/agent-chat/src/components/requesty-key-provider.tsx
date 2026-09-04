"use client";

import { createContext, useContext, useMemo, useState } from "react";

type RequestyKeyContextValue = {
  apiKey: string;
  setApiKey: (value: string) => void;
  clearApiKey: () => void;
};

const RequestyKeyContext = createContext<RequestyKeyContextValue | null>(null);

export function RequestyKeyProvider({ children }: { children: React.ReactNode }) {
  const [apiKey, setApiKey] = useState("");
  const value = useMemo(() => ({ apiKey, setApiKey, clearApiKey: () => setApiKey("") }), [apiKey]);
  return <RequestyKeyContext.Provider value={value}>{children}</RequestyKeyContext.Provider>;
}

export function useRequestyKey() {
  const value = useContext(RequestyKeyContext);
  if (!value) throw new Error("useRequestyKey must be used within RequestyKeyProvider");
  return value;
}
