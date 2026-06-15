import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SolLogo } from "@/components/sol/SolLogo";
import { toast } from "sonner";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/recuperar-senha")({ component: RecPage });
function RecPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Se o e-mail existir, você receberá instruções em instantes.");
  }
  return (
    <div className="min-h-screen bg-primary-soft/30 py-10">
      <div className="mx-auto max-w-md px-4">
        <div className="mb-6 flex justify-center"><SolLogo variant="full" size={72}/></div>
        <Card>
          <CardHeader><CardTitle>Recuperar senha</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <p className="text-sm text-muted-foreground">Informe seu e-mail cadastrado. Enviaremos instruções para redefinir sua senha.</p>
              <div className="space-y-2"><Label>E-mail</Label><Input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)}/></div>
              <div className="flex justify-between">
                <Link to="/login"><Button type="button" variant="outline">Voltar</Button></Link>
                <Button type="submit" disabled={busy}>{busy ? "Enviando…" : "Enviar instruções"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}