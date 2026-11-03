import { createFileRoute } from "@tanstack/react-router";

import { ModulePlaceholder } from "@/components/app-shell";

export const Route = createFileRoute("/_app/deals")({
  head: () => ({ meta: [{ title: "Deals · AgroCRM" }] }),
  component: () => <ModulePlaceholder module="Deals" />,
});
