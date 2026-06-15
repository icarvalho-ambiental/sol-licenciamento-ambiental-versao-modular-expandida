import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SolLogo } from "@/components/sol/SolLogo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({ component: ResetPage });

function ResetPage() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [senha, setSenha] = useState("");
  const [senha2, setSenha2] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Supabase popula a sessão a partir do link no hash (#access_token=...) automaticamente.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (senha.length < 8) return toast.error("Use pelo menos 8 caracteres.");
    if (senha !== senha2) return toast.error("As senhas não coincidem.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Senha redefinida! Faça login com a nova senha.");
    await supabase.auth.signOut();
    nav({ to: "/login" });
  }

  return (
    <div className="min-h-screen bg-primary-soft/30 py-10">
      <div className="mx-auto max-w-md px-4">
        <div className="mb-6 flex justify-center"><SolLogo variant="full" size={72}/></div>
        <Card>
          <CardHeader><CardTitle>Redefinir senha</CardTitle></CardHeader>
          <CardContent>
            {!ready ? (
              <p className="text-sm text-muted-foreground">Abra esta página pelo link que você recebeu por e-mail. Se já o fez e a página continuar carregando, peça um novo link em <Link to="/recuperar-senha" className="underline">Recuperar senha</Link>.</p>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2"><Label>Nova senha</Label><Input type="password" value={senha} onChange={e=>setSenha(e.target.value)} required minLength={8}/></div>
                <div className="space-y-2"><Label>Confirmar nova senha</Label><Input type="password" value={senha2} onChange={e=>setSenha2(e.target.value)} required minLength={8}/></div>
                <div className="flex justify-end"><Button type="submit" disabled={busy}>Salvar nova senha</Button></div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}