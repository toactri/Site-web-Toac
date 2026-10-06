"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { CmsVariables } from "@/lib/cms-variables";

const CmsVariablesContext = createContext<CmsVariables>({});

/** Rend les variables CMS (voir src/lib/cms-variables.ts) disponibles aux textes modifiables. */
export function CmsVariablesProvider({ value, children }: { value: CmsVariables; children: ReactNode }) {
  return <CmsVariablesContext.Provider value={value}>{children}</CmsVariablesContext.Provider>;
}

export function useCmsVariables(): CmsVariables {
  return useContext(CmsVariablesContext);
}
