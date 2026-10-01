// @ts-nocheck
import { createContext, useContext } from "react";

export type HomeModel = Record<string, any>;

export const HomeDashboardContext = createContext<HomeModel | null>(null);

export function useHomeDashboard(): HomeModel {
  const value = useContext(HomeDashboardContext);
  if (!value) throw new Error("HomeDashboardContext missing");
  return value;
}
