import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";

export const Route = createFileRoute("/api/img/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const sql = await getSql();
          const rows = await sql<{ mime: string; data_b64: string }>`select mime, data_b64 from producto_imagenes where product_id = ${params.id}`;
          if (rows.length === 0) return new Response("Not found", { status: 404 });
          return new Response(Buffer.from(rows[0].data_b64, "base64"), {
            headers: { "content-type": rows[0].mime, "cache-control": "public, max-age=31536000, immutable" },
          });
        } catch {
          return new Response("Error", { status: 500 });
        }
      },
    },
  },
});
