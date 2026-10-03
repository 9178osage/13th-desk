import { createContext, useContext } from "react";
import type { useHomeDashboardModel } from "@/components/use-home-dashboard-model";

export type HomeModel = ReturnType<typeof useHomeDashboardModel>;

export const HomeDashboardContext = createContext<HomeModel | null>(null);

export function useHomeDashboard(): HomeModel {
  const value = useContext(HomeDashboardContext);
  if (!value) throw new Error("HomeDashboardContext missing");
  return value;
}
