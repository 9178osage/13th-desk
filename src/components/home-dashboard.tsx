import { HomeDashboardContext } from "@/components/home-dashboard-context";
import { HomeLowerSection } from "@/components/home-lower-section";
import { HomeTasksSection } from "@/components/home-tasks-section";
import { HomeWelcomeHero } from "@/components/home-welcome-hero";
import { useHomeDashboardModel } from "@/components/use-home-dashboard-model";

export function HomeDashboard() {
  const model = useHomeDashboardModel();
  return (
    <HomeDashboardContext.Provider value={model}>
      <div className="home-page">
        <HomeWelcomeHero />
        <HomeTasksSection />
        <HomeLowerSection />
      </div>
    </HomeDashboardContext.Provider>
  );
}
