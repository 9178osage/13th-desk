import { createFileRoute } from "@tanstack/react-router";
import { HomeDashboard } from "@/components/home-dashboard";
import { canonicalLink } from "@/lib/site";

export const Route = createFileRoute("/")({
  head: () => ({ links: [canonicalLink("/")] }),
  component: HomeDashboard,
});
