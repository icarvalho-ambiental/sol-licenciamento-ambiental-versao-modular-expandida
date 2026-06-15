import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { searchMunicipios } from "@/lib/sol/municipios-functions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface MunicipioOption {
  id: number;
  codigo_ibge: string;
  nome: string;
  uf: string;
  estado_nome?: string | null;
}

interface Props {
  value?: MunicipioOption | null;
  onChange: (m: MunicipioOption | null) => void;
  uf?: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
}

/**
 * Autocomplete único reutilizável para selecionar um município a partir
 * da tabela mestra `public.municipios` (5.571 registros IBGE).
 * Padroniza Clientes/Empresas/Empreendimentos/Requerimentos/Dashboard.
 */
export function MunicipioPicker({ value, onChange, uf, label = "Município", placeholder = "Buscar município...", required }: Props) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const search = useServerFn(searchMunicipios);

  const enabled = q.trim().length >= 2;
  const query = useQuery({
    queryKey: ["municipios-search", q, uf ?? ""],
    queryFn: () => search({ data: { q: q.trim(), uf, limit: 20 } }),
    enabled,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (value) setQ(`${value.nome} - ${value.uf}`);
  }, [value?.id]);

  const items = useMemo(() => (query.data ?? []) as MunicipioOption[], [query.data]);

  return (
    <div className="relative">
      {label && <Label className="text-xs">{label}{required && <span className="text-destructive"> *</span>}</Label>}
      <Input
        value={q}
        placeholder={placeholder}
        onChange={(e) => { setQ(e.target.value); setOpen(true); if (value) onChange(null); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && enabled && items.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full max-h-64 overflow-auto rounded-md border bg-popover shadow-lg">
          {items.map((m) => (
            <li
              key={m.id}
              className="cursor-pointer px-3 py-2 text-sm hover:bg-accent"
              onMouseDown={(e) => { e.preventDefault(); onChange(m); setQ(`${m.nome} - ${m.uf}`); setOpen(false); }}
            >
              <span className="font-medium">{m.nome}</span>
              <span className="text-muted-foreground"> · {m.uf}{m.estado_nome ? ` · ${m.estado_nome}` : ""}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default MunicipioPicker;