import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/shortlists/$shortlistId")({
  head: () => ({ meta: [{ title: "Shortlist · Moove Select" }] }),
  component: () => <Outlet />,
});
