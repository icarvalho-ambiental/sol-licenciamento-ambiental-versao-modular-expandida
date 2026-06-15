import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listCepramDivisoes,
  listCepramGrupos,
  listCepramTipologias,
  classifyEnquadramento,
} from "@/lib/sol/cepram-functions";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export interface CepramSelection {
  divisaoId?: string;
  grupoId?: string;
  tipologiaId?: string;
  valorMedida?: number;
  unidadeMedida?: string;
  potencialPoluidor?: "baixo" | "medio" | "alto";
  porte?: "pequeno" | "medio" | "grande" | "excepcional";
  classe?: number;
}

interface Props {
  value: CepramSelection;
  onChange: (next: CepramSelection) => void;
}

/**
 * Cascata Divisão → Grupo → Tipologia com classificação automática
 * de Unidade / Potencial / Porte / Classe via cepram_enquadramentos.
 */
export function CepramPicker({ value, onChange }: Props) {
  const divFn = useServerFn(listCepramDivisoes);
  const grpFn = useServerFn(listCepramGrupos);
  const tipFn = useServerFn(listCepramTipologias);
  const classFn = useServerFn(classifyEnquadramento);

  const divQ = useQuery({ queryKey: ["cepram-div"], queryFn: () => divFn() });
  const grpQ = useQuery({
    queryKey: ["cepram-grp", value.divisaoId],
    queryFn: () => grpFn({ data: { divisaoId: value.divisaoId! } }),
    enabled: !!value.divisaoId,
  });
  const tipQ = useQuery({
    queryKey: ["cepram-tip", value.grupoId],
    queryFn: () => tipFn({ data: { grupoId: value.grupoId! } }),
    enabled: !!value.grupoId,
  });

  const [classifying, setClassifying] = useState(false);

  // Quando tipologia muda, pré-popula unidade default
  useEffect(() => {
    const t = (tipQ.data as any[] | undefined)?.find((x) => x.id === value.tipologiaId);
    if (t?.unidade_medida_default && !value.unidadeMedida) {
      onChange({ ...value, unidadeMedida: t.unidade_medida_default });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.tipologiaId, tipQ.data]);

  // Classifica quando tem tipologia + valor
  useEffect(() => {
    if (!value.tipologiaId || value.valorMedida == null) return;
    setClassifying(true);
    classFn({ data: { tipologiaId: value.tipologiaId, valorMedida: value.valorMedida } })
      .then((r: any) => {
        if (r) {
          onChange({
            ...value,
            unidadeMedida: r.unidadeMedida,
            potencialPoluidor: r.potencialPoluidor,
            porte: r.porte,
            classe: r.classe,
          });
        }
      })
      .finally(() => setClassifying(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.tipologiaId, value.valorMedida]);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label>Divisão *</Label>
        <Select
          value={value.divisaoId ?? ""}
          onValueChange={(v) => onChange({ divisaoId: v })}
        >
          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent>
            {(divQ.data as any[] | undefined)?.map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Grupo *</Label>
        <Select
          value={value.grupoId ?? ""}
          onValueChange={(v) => onChange({ ...value, grupoId: v, tipologiaId: undefined })}
          disabled={!value.divisaoId}
        >
          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent>
            {(grpQ.data as any[] | undefined)?.map((g) => (
              <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label>Tipologia *</Label>
        <Select
          value={value.tipologiaId ?? ""}
          onValueChange={(v) => onChange({ ...value, tipologiaId: v })}
          disabled={!value.grupoId}
        >
          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent>
            {(tipQ.data as any[] | undefined)?.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Valor da Medida</Label>
        <Input
          type="number"
          step="any"
          value={value.valorMedida ?? ""}
          onChange={(e) => {
            const n = e.target.value === "" ? undefined : Number(e.target.value);
            onChange({ ...value, valorMedida: n });
          }}
        />
      </div>
      <div className="space-y-2">
        <Label>Unidade</Label>
        <Input value={value.unidadeMedida ?? ""} readOnly placeholder="—" />
      </div>
      <div className="space-y-2">
        <Label>Potencial Poluidor</Label>
        <Input value={value.potencialPoluidor ?? ""} readOnly placeholder={classifying ? "calculando…" : "—"} />
      </div>
      <div className="space-y-2">
        <Label>Porte</Label>
        <Input value={value.porte ?? ""} readOnly placeholder={classifying ? "calculando…" : "—"} />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label>Classe</Label>
        <Input value={value.classe ?? ""} readOnly placeholder="—" />
      </div>
      {value.tipologiaId && value.valorMedida != null && value.classe == null && !classifying && (
        <p className="md:col-span-2 text-xs text-amber-600">
          Nenhum enquadramento cadastrado para essa faixa. Peça ao administrador para cadastrar em Admin → CEPRAM.
        </p>
      )}
    </div>
  );
}

export default CepramPicker;