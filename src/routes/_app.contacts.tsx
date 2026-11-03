import { createFileRoute } from "@tanstack/react-router";

import { ModulePlaceholder } from "@/components/app-shell";

export const Route = createFileRoute("/_app/contacts")({
  head: () => ({ meta: [{ title: "Contacts · AgroCRM" }] }),
  component: () => <ModulePlaceholder module="Contacts" />,
});
