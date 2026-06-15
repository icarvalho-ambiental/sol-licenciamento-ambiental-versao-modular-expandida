import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { lookupCep, type CepInfo } from "@/lib/sol/cep";
import { toast } from "sonner";
import { Search } from "lucide-react";

type Props = {
  /** Callback chamado quando o CEP é resolvido com sucesso. */
  onResolved: (info: CepInfo) => void;
  /** valor inicial opcional */
  defaultCep?: string;
  className?: string;
};

/**
 * Componente reutilizável de busca de CEP (BrasilAPI).
 * Usado em Empresas, Empreendimentos, Perfil e demais formulários
 * que precisem preencher Logradouro / Bairro / Cidade / UF.
 */
export function CepLookup({ onResolved, defaultCep = "", className }: Props) {
  const [cep, setCep] = useState(defaultCep);
  const [busy, setBusy] = useState(false);

  async function buscar() {
    setBusy(true);
    try {
      const info = await lookupCep(cep);
      onResolved(info);
      toast.success(`CEP encontrado: ${info.city}/${info.state}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <Label>CEP</Label>
      <div className="flex gap-2">
        <Input
          value={cep}
          onChange={(e) => setCep(e.target.value)}
          placeholder="00000-000"
          maxLength={9}
          inputMode="numeric"
        />
        <Button type="button" variant="outline" disabled={busy} onClick={buscar}>
          <Search size={14} className="mr-1" /> {busy ? "Buscando…" : "Buscar"}
        </Button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Fonte: BrasilAPI. Preenche logradouro, bairro, cidade e UF automaticamente.
      </p>
    </div>
  );
}