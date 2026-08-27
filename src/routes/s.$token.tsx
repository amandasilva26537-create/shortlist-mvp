import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/s/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Shortlist executiva" },
      {
        name: "description",
        content:
          "Compare candidatos pré-selecionados, revise pareceres consultivos e registre decisões diretamente na shortlist.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Shortlist executiva" },
      {
        property: "og:description",
        content: "Portal privado para o gestor comparar candidatos e registrar decisões.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: () => <Outlet />,
});
