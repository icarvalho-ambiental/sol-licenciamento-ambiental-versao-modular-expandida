import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Filter, ArrowUp, ArrowDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type GridColumn<T> = {
  key: string;
  label: string;
  get: (row: T) => any;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  filter?: "text" | "boolean" | { type: "select"; options: { value: string; label: string }[] };
  width?: string;
  align?: "left" | "center" | "right";
};

type SortState = { key: string; dir: "asc" | "desc" } | null;

export type DataGridProps<T> = {
  rows: T[];
  columns: GridColumn<T>[];
  rowId: (row: T) => string;
  selectable?: boolean;
  selected: Set<string>;
  onSelectedChange: (sel: Set<string>) => void;
  search?: string;
  onFilteredRowsChange?: (rows: T[]) => void;
  pageSize?: number;
  pageSizeOptions?: number[];
  emptyMessage?: string;
};

function matches(val: any, filter: any, kind: GridColumn<any>["filter"]): boolean {
  if (filter === undefined || filter === "" || filter === null) return true;
  if (kind === "boolean") return Boolean(val) === (filter === "yes");
  if (typeof kind === "object" && kind?.type === "select") return String(val ?? "") === filter;
  return String(val ?? "").toLowerCase().includes(String(filter).toLowerCase());
}

export function DataGrid<T>({
  rows, columns, rowId, selectable = true, selected, onSelectedChange,
  search = "", onFilteredRowsChange,
  pageSize: initialPageSize = 20,
  pageSizeOptions = [20, 50, 100, 200],
  emptyMessage = "Nenhum registro encontrado.",
}: DataGridProps<T>) {
  const [sort, setSort] = useState<SortState>(null);
  const [colFilters, setColFilters] = useState<Record<string, any>>({});
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    let out = rows.filter((r) => {
      if (s) {
        const hay = columns.map((c) => String(c.get(r) ?? "")).join(" ").toLowerCase();
        if (!hay.includes(s)) return false;
      }
      for (const c of columns) {
        const f = colFilters[c.key];
        if (f !== undefined && f !== "" && f !== null) {
          if (!matches(c.get(r), f, c.filter)) return false;
        }
      }
      return true;
    });
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col) {
        out = [...out].sort((a, b) => {
          const va = col.get(a); const vb = col.get(b);
          if (va == null && vb == null) return 0;
          if (va == null) return 1; if (vb == null) return -1;
          const cmp = typeof va === "number" && typeof vb === "number"
            ? va - vb
            : String(va).localeCompare(String(vb), "pt-BR", { sensitivity: "base" });
          return sort.dir === "asc" ? cmp : -cmp;
        });
      }
    }
    return out;
  }, [rows, columns, search, colFilters, sort]);

  useEffect(() => { onFilteredRowsChange?.(filtered); }, [filtered, onFilteredRowsChange]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const pageIds = pageRows.map(rowId);
  const allChecked = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const someChecked = pageIds.some((id) => selected.has(id)) && !allChecked;

  const toggleAll = (v: boolean) => {
    const next = new Set(selected);
    pageIds.forEach((id) => { if (v) next.add(id); else next.delete(id); });
    onSelectedChange(next);
  };
  const toggleOne = (id: string, v: boolean) => {
    const next = new Set(selected);
    if (v) next.add(id); else next.delete(id);
    onSelectedChange(next);
  };

  const handleSort = (col: GridColumn<T>) => {
    if (col.sortable === false) return;
    setSort((prev) => {
      if (!prev || prev.key !== col.key) return { key: col.key, dir: "asc" };
      if (prev.dir === "asc") return { key: col.key, dir: "desc" };
      return null;
    });
  };

  return (
    <div className="flex flex-col border border-[hsl(var(--border))] bg-white">
      <div className="overflow-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead className="sticky top-0 z-10 bg-slate-50 text-slate-700">
            <tr>
              {selectable && (
                <th className="w-9 border-b border-r border-slate-200 px-2 py-1.5 text-left">
                  <Checkbox
                    checked={allChecked ? true : someChecked ? "indeterminate" : false}
                    onCheckedChange={(v) => toggleAll(!!v)}
                  />
                </th>
              )}
              {columns.map((c) => {
                const sortIcon = sort?.key === c.key
                  ? (sort.dir === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />)
                  : null;
                return (
                  <th key={c.key} className="border-b border-r border-slate-200 px-2 py-1.5 text-left font-semibold" style={c.width ? { width: c.width } : undefined}>
                    <div className="flex items-center justify-between gap-1">
                      <button
                        type="button"
                        className={cn("flex items-center gap-1 truncate text-left", c.sortable !== false && "hover:text-primary")}
                        onClick={() => handleSort(c)}
                      >
                        <span className="truncate">{c.label}</span>
                        {sortIcon}
                      </button>
                      {c.filter && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className={cn(
                                "rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700",
                                colFilters[c.key] !== undefined && colFilters[c.key] !== "" && "text-primary"
                              )}
                              aria-label={`Filtrar ${c.label}`}
                            >
                              <Filter size={11} />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56 p-2">
                            <div className="mb-1 text-xs font-medium text-muted-foreground">Filtrar {c.label}</div>
                            {c.filter === "text" && (
                              <Input
                                value={colFilters[c.key] ?? ""}
                                onChange={(e) => { setColFilters((p) => ({ ...p, [c.key]: e.target.value })); setPage(1); }}
                                placeholder="Contém..."
                                className="h-8"
                              />
                            )}
                            {c.filter === "boolean" && (
                              <Select
                                value={colFilters[c.key] ?? "all"}
                                onValueChange={(v) => { setColFilters((p) => ({ ...p, [c.key]: v === "all" ? "" : v })); setPage(1); }}
                              >
                                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">Todos</SelectItem>
                                  <SelectItem value="yes">Sim</SelectItem>
                                  <SelectItem value="no">Não</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                            {typeof c.filter === "object" && c.filter?.type === "select" && (
                              <Select
                                value={colFilters[c.key] ?? "__all__"}
                                onValueChange={(v) => { setColFilters((p) => ({ ...p, [c.key]: v === "__all__" ? "" : v })); setPage(1); }}
                              >
                                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__all__">Todos</SelectItem>
                                  {c.filter.options.map((o) => (
                                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            {colFilters[c.key] !== undefined && colFilters[c.key] !== "" && (
                              <button
                                type="button"
                                className="mt-2 text-xs text-muted-foreground hover:text-foreground"
                                onClick={() => { setColFilters((p) => { const n = { ...p }; delete n[c.key]; return n; }); setPage(1); }}
                              >
                                Limpar filtro
                              </button>
                            )}
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            )}
            {pageRows.map((row) => {
              const id = rowId(row);
              const isSel = selected.has(id);
              return (
                <tr key={id} className={cn("border-b border-slate-100 hover:bg-slate-50", isSel && "bg-primary/5")}>
                  {selectable && (
                    <td className="border-r border-slate-100 px-2 py-1">
                      <Checkbox checked={isSel} onCheckedChange={(v) => toggleOne(id, !!v)} />
                    </td>
                  )}
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={cn("border-r border-slate-100 px-2 py-1 align-middle", c.align === "center" && "text-center", c.align === "right" && "text-right")}
                    >
                      {c.render ? c.render(row) : String(c.get(row) ?? "")}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-600">
        <div className="flex items-center gap-1">
          <button type="button" disabled={safePage === 1} onClick={() => setPage(1)} className="rounded border border-slate-300 bg-white p-1 disabled:opacity-40"><ChevronsLeft size={14} /></button>
          <button type="button" disabled={safePage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded border border-slate-300 bg-white p-1 disabled:opacity-40"><ChevronLeft size={14} /></button>
          <Input type="number" min={1} max={totalPages} value={safePage} onChange={(e) => setPage(Math.max(1, Math.min(totalPages, Number(e.target.value) || 1)))} className="h-7 w-14 text-center text-xs" />
          <span>de {totalPages}</span>
          <button type="button" disabled={safePage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="rounded border border-slate-300 bg-white p-1 disabled:opacity-40"><ChevronRight size={14} /></button>
          <button type="button" disabled={safePage === totalPages} onClick={() => setPage(totalPages)} className="rounded border border-slate-300 bg-white p-1 disabled:opacity-40"><ChevronsRight size={14} /></button>
          <span className="ml-3 text-muted-foreground">{filtered.length} registro(s){selected.size > 0 && ` · ${selected.size} selecionado(s)`}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Tamanho da página:</span>
          <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
            <SelectTrigger className="h-7 w-20 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((s) => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}