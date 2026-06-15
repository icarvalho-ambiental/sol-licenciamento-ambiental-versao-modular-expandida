import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/sol/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SolLogo } from "@/components/sol/SolLogo";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Mail, RefreshCw, LogOut } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { saveProfilePersonalData, sendVerificationCode, verifyEmailCode } from "@/lib/sol/auth-functions";

export const Route = createFileRoute("/concluir-cadastro")({ component: ConcluirCadastro });

function ConcluirCadastro() {
  const { user, refresh, logout } = useAuth();
  const nav = useNavigate();

  const savePersonal = useServerFn(saveProfilePersonalData);
  const sendCode = useServerFn(sendVerificationCode);
  const verify = useServerFn(verifyEmailCode);

  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [codigo, setCodigo] = useState("");
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [devCode, setDevCode] = useState<string | undefined>();
  const [step, setStep] = useState<1 | 2>(1);

  useEffect(() => {
    if (!user) { nav({ to: "/login" }); return; }
    if (user.perfilCompleto) { nav({ to: "/" }); return; }
    setNome(user.nome || "");
    if (user.cpf) { setCpf(user.cpf); setStep(2); }
  }, [user]);

  if (!user) return null;

  const onSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPersonal(true);
    try {
      await savePersonal({ data: { nome_completo: nome, cpf, telefone } });
      toast.success("Dados pessoais salvos.");
      await refresh();
      setStep(2);
    } catch (err: any) { toast.error(err.message); }
    finally { setSavingPersonal(false); }
  };

  const onSendCode = async () => {
    setSending(true);
    try {
      const r: any = await sendCode();
      setEmailSent(true);
      if (r?.codigo) { setDevCode(r.codigo); toast.success(`Código gerado: ${r.codigo} (e-mail ainda não configurado — use este código)`, { duration: 12000 }); }
      else toast.success(`Código enviado para ${r.email}. Verifique sua caixa de entrada.`);
    } catch (err: any) { toast.error(err.message); }
    finally { setSending(false); }
  };

  const onVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(codigo)) return toast.error("O código tem 6 dígitos.");
    setVerifying(true);
    try {
      await verify({ data: { codigo } });
      toast.success("E-mail validado! Cadastro concluído.");
      await refresh();
      nav({ to: "/" });
    } catch (err: any) { toast.error(err.message); }
    finally { setVerifying(false); }
  };

  return (
    <div className="min-h-screen bg-primary-soft/30 py-10">
      <div className="mx-auto max-w-2xl px-4">
        <div className="mb-6 flex justify-center"><SolLogo variant="full" size={72}/></div>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Concluir Cadastro</CardTitle>
            <Button variant="ghost" size="sm" className="gap-2" onClick={async () => { await logout(); nav({ to: "/login" }); }}>
              <LogOut size={14}/> Sair
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Seu cadastro está em modo restrito. Conclua os dois passos abaixo para liberar as funções do sistema.
            </p>

            {/* Passo 1 */}
            <section className={step === 1 ? "" : "opacity-80"}>
              <h2 className="mb-3 flex items-center gap-2 font-semibold">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${step > 1 ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
                  {step > 1 ? <CheckCircle2 size={14}/> : "1"}
                </span>
                Dados pessoais
              </h2>
              <form onSubmit={onSavePersonal} className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5 md:col-span-2"><Label>Nome completo *</Label>
                  <Input value={nome} onChange={e=>setNome(e.target.value)} disabled={step>1} required/></div>
                <div className="space-y-1.5"><Label>CPF *</Label>
                  <Input value={cpf} onChange={e=>setCpf(e.target.value)} placeholder="000.000.000-00" disabled={step>1} required/></div>
                <div className="space-y-1.5"><Label>Telefone *</Label>
                  <Input value={telefone} onChange={e=>setTelefone(e.target.value)} placeholder="(71) 90000-0000" disabled={step>1} required/></div>
                {step === 1 && (
                  <div className="md:col-span-2 flex justify-end">
                    <Button type="submit" disabled={savingPersonal}>
                      {savingPersonal && <Loader2 size={14} className="mr-2 animate-spin"/>} Salvar e avançar
                    </Button>
                  </div>
                )}
              </form>
            </section>

            {/* Passo 2 */}
            <section className={step === 2 ? "" : "pointer-events-none opacity-50"}>
              <h2 className="mb-3 flex items-center gap-2 font-semibold">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">2</span>
                Validar e-mail
              </h2>
              <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
                <div className="flex items-center gap-2"><Mail size={14} className="text-primary"/> <strong>{user.email}</strong></div>
                <p className="mt-1 text-xs text-muted-foreground">Enviaremos um código de 6 dígitos para o e-mail acima. Copie e cole abaixo para concluir.</p>
              </div>
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <Button type="button" variant="outline" onClick={onSendCode} disabled={sending} className="gap-2">
                  {sending ? <Loader2 size={14} className="animate-spin"/> : <RefreshCw size={14}/>}
                  {emailSent ? "Reenviar código" : "Enviar código"}
                </Button>
                {devCode && <span className="text-xs text-amber-700">Código de desenvolvimento: <code className="rounded bg-amber-100 px-1.5 py-0.5">{devCode}</code></span>}
              </div>
              <form onSubmit={onVerify} className="mt-4 flex items-end gap-2">
                <div className="flex-1 space-y-1.5">
                  <Label>Código recebido</Label>
                  <Input value={codigo} onChange={e=>setCodigo(e.target.value.replace(/\D/g,"").slice(0,6))} placeholder="000000" inputMode="numeric"/>
                </div>
                <Button type="submit" disabled={verifying || !emailSent}>
                  {verifying && <Loader2 size={14} className="mr-2 animate-spin"/>} Validar
                </Button>
              </form>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}