import { createFileRoute, notFound } from "@tanstack/react-router";
import { HomeDashboard } from "@/components/home-dashboard";
import { isChannel } from "@/lib/channels";

// /card, /isa, … render the home page (see lib/channels.ts); any other
// single-segment path keeps the normal 404.
export const Route = createFileRoute("/$channel")({
  beforeLoad: ({ params }) => {
    if (!isChannel(params.channel)) throw notFound();
  },
  component: HomeDashboard,
});
