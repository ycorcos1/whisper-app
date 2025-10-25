/**
 * useCasper Hook
 * Custom hook for accessing and controlling the Casper AI agent panel
 */

import { useContext } from "react";
import { CasperContextAPI } from "./CasperRootContext";

export const useCasper = () => {
  const context = useContext(CasperContextAPI);

  if (!context) {
    throw new Error("useCasper must be used within a CasperProvider");
  }

  return context;
};
