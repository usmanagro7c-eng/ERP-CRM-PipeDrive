import { createFileRoute } from "@tanstack/react-router";

import { ModulePlaceholder } from "@/components/app-shell";

export const Route = createFileRoute("/_app/activities")({
  head: () => ({ meta: [{ title: "Activities · AgroCRM" }] }),
  component: () => <ModulePlaceholder module="Activities" />,
});
