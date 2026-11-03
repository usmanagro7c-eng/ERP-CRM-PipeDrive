import { createFileRoute } from "@tanstack/react-router";

import { ModulePlaceholder } from "@/components/app-shell";

export const Route = createFileRoute("/_app/leads")({
  head: () => ({ meta: [{ title: "Leads · AgroCRM" }] }),
  component: () => <ModulePlaceholder module="Leads" />,
});
