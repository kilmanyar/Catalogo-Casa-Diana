import { createFileRoute } from "@tanstack/react-router";
import { StorePage } from "@/components/store/store-page";

type CatalogSearch = { cat?: string; q?: string; p?: string };

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): CatalogSearch => ({
    cat: typeof search.cat === "string" && search.cat ? search.cat : undefined,
    q: typeof search.q === "string" && search.q ? search.q : undefined,
    p: typeof search.p === "string" && search.p ? search.p : undefined,
  }),
  component: StorePage,
});
