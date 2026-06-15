import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/sol/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getHomeContent, updateHomeContent, type HomeSlide } from "@/lib/sol/home-content-functions";
import { toast } from "sonner";
import { Plus, Trash2, Save } from "lucide-react";

export const Route = createFileRoute("/admin/home")({ component: Page });

function Page() {
  const qc = useQueryClient();
  const fetchFn = useServerFn(getHomeContent);
  const saveFn = useServerFn(updateHomeContent);
  const q = useQuery({ queryKey: ["home-content"], queryFn: () => fetchFn() });

  const [videoUrl, setVideoUrl] = useState("");
  const [slides, setSlides] = useState<HomeSlide[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (q.data) {
      setVideoUrl(q.data.video_url ?? "");
      setSlides(q.data.slides ?? []);
    }
  }, [q.data]);

  function updSlide(i: number, k: keyof HomeSlide, v: string) {
    setSlides((s) => s.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)));
  }
  function addSlide() {
    setSlides((s) => [...s, { src: "", title: "", caption: "" }]);
  }
  function removeSlide(i: number) {
    setSlides((s) => s.filter((_, idx) => idx !== i));
  }

  async function salvar() {
    setBusy(true);
    try {
      const cleaned = slides.filter((s) => s.src.trim().length > 0);
      await saveFn({ data: { video_url: videoUrl.trim() || null, slides: cleaned } });
      toast.success("Conteúdo da Home atualizado.");
      qc.invalidateQueries({ queryKey: ["home-content"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Conteúdo da Home"
        subtitle="Edite o vídeo institucional e os slides do carrossel exibidos na tela inicial."
        breadcrumb={["Administração", "Home"]}
      />
      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Vídeo Institucional</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Label>URL de embed (YouTube, Vimeo, etc.)</Label>
            <Input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/embed/..."
            />
            <p className="text-xs text-muted-foreground">
              Deixe vazio para não exibir o bloco de vídeo na Home.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Slides do Carrossel</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addSlide}>
              <Plus size={14} className="mr-1"/> Novo slide
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {slides.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum slide cadastrado. O carrossel ficará oculto na Home.
              </p>
            )}
            {slides.map((s, i) => (
              <div key={i} className="grid gap-3 rounded-lg border bg-card p-3 sm:grid-cols-[1fr_auto]">
                <div className="space-y-2">
                  <div>
                    <Label>URL da imagem</Label>
                    <Input value={s.src} onChange={(e) => updSlide(i, "src", e.target.value)} placeholder="https://..."/>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <Label>Título</Label>
                      <Input value={s.title} onChange={(e) => updSlide(i, "title", e.target.value)}/>
                    </div>
                    <div>
                      <Label>Legenda</Label>
                      <Textarea
                        rows={2}
                        value={s.caption}
                        onChange={(e) => updSlide(i, "caption", e.target.value)}
                      />
                    </div>
                  </div>
                  {s.src && (
                    <div className="overflow-hidden rounded-md border bg-muted">
                      <img src={s.src} alt={s.title} className="h-32 w-full object-cover"/>
                    </div>
                  )}
                </div>
                <div className="flex items-start">
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeSlide(i)} title="Remover">
                    <Trash2 size={16} className="text-destructive"/>
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={salvar} disabled={busy}>
            <Save size={14} className="mr-1"/> {busy ? "Salvando…" : "Salvar conteúdo"}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}