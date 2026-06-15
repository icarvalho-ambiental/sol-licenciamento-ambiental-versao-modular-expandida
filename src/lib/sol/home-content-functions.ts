import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabase as anonSupabase } from "@/integrations/supabase/client";
import { z } from "zod";

export type HomeSlide = { src: string; title: string; caption: string };
export type HomeContent = { video_url: string | null; slides: HomeSlide[] };

const slideSchema = z.object({
  src: z.string().trim().url().max(1000),
  title: z.string().trim().max(200).default(""),
  caption: z.string().trim().max(400).default(""),
});

/** Leitura pública — usa o client anônimo (a tabela permite select to anon). */
export const getHomeContent = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await anonSupabase
    .from("home_content" as any)
    .select("video_url, slides")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const row = (data ?? { video_url: null, slides: [] }) as any;
  return {
    video_url: (row.video_url as string | null) ?? null,
    slides: Array.isArray(row.slides) ? (row.slides as HomeSlide[]) : [],
  } satisfies HomeContent;
});

export const updateHomeContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      video_url: z.string().trim().max(1000).nullable().optional(),
      slides: z.array(slideSchema).max(20).default([]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("home_content" as any)
      .upsert({
        id: 1,
        video_url: data.video_url?.trim() || null,
        slides: data.slides,
        atualizado_em: new Date().toISOString(),
        atualizado_por: context.userId,
      });
    if (error) throw new Error(error.message);
    return { ok: true };
  });