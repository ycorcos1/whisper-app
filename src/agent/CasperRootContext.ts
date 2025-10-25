import { createContext } from "react";
import type { Animated } from "react-native";
import type {
  CasperTab,
  CasperContext as CasperContextType,
  CasperOpenOptions,
  CasperState,
} from "../types/agent";

export interface CasperContextValue {
  state: CasperState;
  heightAnim: Animated.Value;
  open: (opts: CasperOpenOptions) => void;
  close: () => void;
  setContext: (ctx: CasperContextType) => void;
  setActiveTab: (tab: CasperTab) => void;
}

export const CasperContextAPI = createContext<CasperContextValue | undefined>(
  undefined
);

