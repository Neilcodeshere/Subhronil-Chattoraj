"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { LoadingScreen } from "./loading-screen";

const IntroReadyContext = createContext(false);

export function IntroProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const complete = useCallback(() => setReady(true), []);

  return <IntroReadyContext.Provider value={ready}><LoadingScreen onComplete={complete} />{children}</IntroReadyContext.Provider>;
}

export function useIntroReady() {
  return useContext(IntroReadyContext);
}
