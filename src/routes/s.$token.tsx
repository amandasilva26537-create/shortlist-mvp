import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/s/$token")({
  ssr: false,
  head: () => ({ meta: [{ title: "Shortlist" }] }),
  component: () => <Outlet />,
});
