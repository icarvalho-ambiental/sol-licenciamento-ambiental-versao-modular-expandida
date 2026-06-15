import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { lookupCpf } from "@/lib/sol/vinculos-functions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface Props {
  label: string;
  value: string;
  onChange: (cpf: string, info?: { nome?: string | null; userId?: string | null }) => void;
  required?: boolean;
}

const onlyDigits = (s: string) => s.replace(/\D/g, "");
const formatCpf = (s: string) => {
  const d = onlyDigits(s).slice(0, 11);
  return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{0,2}).*/, "$1.$2.$3-$4").replace(/[-.]+$/, "");
};

/**
 * Campo de CPF com lookup automático em profiles. Quando o CPF já existe
 * no sistema, mostra um badge "vinculado" para indicar que o futuro vínculo
 * vai conceder acesso direto ao usuário dono daquele CPF.
 */
export function CpfVinculoField({ label, value, onChange, required }: Props) {
  const fn = useServerFn(lookupCpf);
  const [info, setInfo] = useState<{ nome?: string | null; userId?: string | null } | null>(null);
  const [checking, setChecking] = useState(false);

  async function onBlur() {
    const cpf = onlyDigits(value);
    if (cpf.length !== 11) return;
    setChecking(true);
    try {
      const r = await fn({ data: { cpf } });
      setInfo({ nome: r.nome, userId: r.userId });
      onChange(cpf, { nome: r.nome, userId: r.userId });
    } finally { setChecking(false); }
  }

  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}{required && <span className="text-destructive"> *</span>}</Label>
      <Input
        value={formatCpf(value)}
        onChange={(e) => { onChange(onlyDigits(e.target.value)); setInfo(null); }}
        onBlur={onBlur}
        placeholder="000.000.000-00"
        inputMode="numeric"
        maxLength={14}
      />
      <div className="text-xs text-muted-foreground min-h-[1rem]">
        {checking && "Buscando CPF…"}
        {!checking && info?.userId && (
          <span className="inline-flex items-center gap-2">
            <Badge variant="secondary">Usuário do sistema</Badge>
            {info.nome ?? ""}
          </span>
        )}
        {!checking && info && !info.userId && value.length === 11 && (
          <span>CPF ainda não cadastrado — o acesso será concedido quando essa pessoa criar conta.</span>
        )}
      </div>
    </div>
  );
}

export default CpfVinculoField;