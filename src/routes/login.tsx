import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/sol/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { SolLogo } from "@/components/sol/SolLogo";
import { toast } from "sonner";
import { LogIn, UserPlus, KeyRound, Globe, BookOpen, Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !senha) { toast.error("Informe e-mail e senha."); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    await refresh();
    toast.success("Bem-vindo ao SOL.");
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar with small centered logo */}
      <header className="border-b border-border bg-primary-soft/50">
        <div className="flex h-14 items-center justify-center">
          <SolLogo size={28}/>
        </div>
      </header>

      {/* Centered login card */}
      <div className="flex items-start justify-center px-4 py-20 md:py-28">
        <div className="flex w-full max-w-md flex-col items-end gap-3">
          <Card className="w-full overflow-hidden p-0 shadow-[var(--shadow-card)]">
            <div className="border-b border-border bg-primary-soft/60 px-6 py-3 text-center">
              <div className="text-base font-semibold text-primary">Acesso a Plataforma SOL</div>
            </div>
            <form onSubmit={submit} className="space-y-5 px-6 py-6">
              <div className="flex justify-center py-2">
                <SolLogo variant="full" size={90}/>
              </div>
              <p className="text-sm text-primary">Digite seu e-mail e senha abaixo.</p>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-normal text-foreground">Nome do Usuário</Label>
                <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-none border-border focus-visible:ring-1"/>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="senha" className="text-sm font-normal text-foreground">Senha</Label>
                <Input id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} className="rounded-none border-border focus-visible:ring-1"/>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button type="submit" disabled={loading} className="flex-1 gap-2 rounded-sm bg-primary hover:bg-primary/90">
                  {loading ? <Loader2 size={16} className="animate-spin"/> : <LogIn size={16}/>} Acessar
                </Button>
                <Button type="button" variant="outline" onClick={() => setRegisterOpen(true)} className="flex-1 gap-2 rounded-sm border-border">
                  <UserPlus size={16} className="text-blue-600"/> Cadastrar
                </Button>
                <Link to="/recuperar-senha" className="flex-1">
                  <Button type="button" variant="outline" className="w-full gap-2 rounded-sm border-border">
                    <KeyRound size={16} className="text-blue-600"/> Recuperar
                  </Button>
                </Link>
              </div>

              <Link to="/consulta-publica">
                <Button type="button" variant="secondary" className="w-full gap-2 rounded-sm">
                  <Globe size={18}/> Consulta Pública
                </Button>
              </Link>
            </form>
          </Card>

          <a
            href="https://drive.google.com/uc?export=download&id=1l9ku4IUu_d1TcukbP-RO9X8waRgX9mhO"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary underline underline-offset-4 hover:text-primary/80"
          >
            <BookOpen size={16}/>
            Baixar Manual de Usuário
          </a>
        </div>
      </div>

      <RegisterDialog open={registerOpen} onOpenChange={setRegisterOpen} onRegistered={async () => {
        await refresh();
        navigate({ to: "/concluir-cadastro" });
      }}/>
    </div>
  );
}

function RegisterDialog({ open, onOpenChange, onRegistered }: { open: boolean; onOpenChange: (v: boolean) => void; onRegistered: () => void }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [email2, setEmail2] = useState("");
  const [senha, setSenha] = useState("");
  const [senha2, setSenha2] = useState("");
  const [aceite, setAceite] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !email || !senha) return toast.error("Preencha todos os campos.");
    if (email !== email2) return toast.error("Os e-mails não coincidem.");
    if (senha !== senha2) return toast.error("As senhas não coincidem.");
    if (senha.length < 6) return toast.error("A senha deve ter no mínimo 6 caracteres.");
    if (!aceite) return toast.error("Você precisa aceitar os Termos de Uso e a Política de Privacidade.");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password: senha,
      options: { emailRedirectTo: window.location.origin, data: { nome_completo: nome.trim(), termos_aceitos: true, termos_versao: "1.0" } },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Conta criada! Complete seu cadastro para liberar as funções.");
    onOpenChange(false);
    onRegistered();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="text-primary text-center">Registrar Novo Usuário</DialogTitle></DialogHeader>
        <div className="flex justify-center py-2"><SolLogo variant="full" size={80}/></div>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5"><Label>Nome Completo</Label><Input value={nome} onChange={e=>setNome(e.target.value)} required/></div>
          <div className="space-y-1.5"><Label>E-mail</Label><Input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></div>
          <div className="space-y-1.5"><Label>Confirmar E-mail</Label><Input type="email" value={email2} onChange={e=>setEmail2(e.target.value)} required/></div>
          <div className="space-y-1.5"><Label>Senha</Label><Input type="password" value={senha} onChange={e=>setSenha(e.target.value)} required/></div>
          <div className="space-y-1.5"><Label>Confirmar Senha</Label><Input type="password" value={senha2} onChange={e=>setSenha2(e.target.value)} required/></div>
          <label className="flex items-start gap-2 text-xs text-muted-foreground pt-1">
            <Checkbox checked={aceite} onCheckedChange={(v)=>setAceite(!!v)} className="mt-0.5"/>
            <span>Li e aceito os <Link to="/termos" target="_blank" className="text-primary underline">Termos de Uso</Link> e a <Link to="/privacidade" target="_blank" className="text-primary underline">Política de Privacidade</Link>.</span>
          </label>
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={()=>onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90">
              {loading ? <Loader2 size={16} className="mr-2 animate-spin"/> : null} OK
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}