import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/sol/AppShell";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { adminListUsuariosGrid, adminDeleteUsuarios } from "@/lib/sol/admin-functions";
import { DataGrid, type GridColumn } from "@/components/sol/DataGrid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Search, Download, RefreshCw, FileSpreadsheet, FileText, FileType2 } from "lucide-react";
import { toast } from "sonner";
import { exportCSV, exportXLSX } from "@/lib/sol/export-grid";
import { useAuth } from "@/lib/sol/auth";

export const Route = createFileRoute("/admin/usuarios")({ component: AdminUsuarios });

type Row = {
  id: string; nome: string; email: string; nomeUsuario: string;
  perfil: string; emailConfirmado: boolean; verificado: boolean; cliente: string;
};

const PERFIL_LABEL: Record<string, string> = {
  admin: "Administrador",
  gac: "GAC",
  analista: "Analista",
  representante_legal: "Representante legal",
  tecnico: "Técnico",
  externo: "Externo",
};
const fmtPerfil = (p: string) => PERFIL_LABEL[p] ?? p;

function AdminUsuarios() {
  const { user } = useAuth();
  const nav = useNavigate();
  useEffect(() => { if (user && user.role !== "admin") nav({ to: "/" }); }, [user, nav]);

  const list = useServerFn(adminListUsuariosGrid);
  const del = useServerFn(adminDeleteUsuarios);

  const { data = [], isFetching, refetch } = useQuery({
    queryKey: ["admin-usuarios-grid"],
    queryFn: () => list() as Promise<Row[]>,
  });

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filteredRows, setFilteredRows] = useState<Row[]>([]);
  const [confirmDel, setConfirmDel] = useState(false);

  const perfilOptions = Array.from(new Set(data.map((r) => r.perfil)))
    .map((v) => ({ value: v, label: fmtPerfil(v) }));

  const columns: GridColumn<Row>[] = [
    { key: "nome", label: "Nome", get: (r) => r.nome, sortable: true, filter: "text", render: (r) => <span className="font-medium text-slate-800">{r.nome || "—"}</span> },
    { key: "email", label: "Email", get: (r) => r.email, sortable: true, filter: "text", render: (r) => <span className="text-primary">{r.email}</span> },
    { key: "nomeUsuario", label: "Nome do Usuário", get: (r) => r.nomeUsuario, sortable: true, filter: "text" },
    { key: "perfil", label: "Perfil", get: (r) => fmtPerfil(r.perfil), sortable: true, filter: { type: "select", options: perfilOptions.map((o) => ({ value: o.label, label: o.label })) } },
    { key: "emailConfirmado", label: "Email Confirmado", get: (r) => r.emailConfirmado, sortable: true, filter: "boolean", align: "center", render: (r) => r.emailConfirmado ? "Sim" : "Não" },
    { key: "verificado", label: "Verificado", get: (r) => r.verificado, sortable: true, filter: "boolean", align: "center", render: (r) => r.verificado ? "Sim" : "Não" },
    { key: "cliente", label: "Cliente", get: (r) => r.cliente, sortable: true, filter: "text" },
  ];

  const exportCols = columns.map((c) => ({ key: c.key, label: c.label, get: (r: Row) => c.get(r) }));
  const exportRows = filteredRows.length ? filteredRows : data;

  const onDelete = async () => {
    try {
      const ids = Array.from(selected);
      await del({ data: { ids } });
      toast.success(`${ids.length} usuário(s) excluído(s).`);
      setSelected(new Set());
      setConfirmDel(false);
      refetch();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <AppShell>
      {/* Header verde institucional */}
      <div className="mb-3 flex items-center gap-2 border-b border-emerald-700/20 pb-2">
        <h1 className="text-xl font-semibold text-slate-800">Usuários</h1>
        <span className="text-xs text-muted-foreground">· Administração</span>
      </div>

      {/* Toolbar */}
      <div className="mb-2 flex flex-wrap items-center gap-2 rounded border border-slate-200 bg-slate-50 px-2 py-1.5">
        <Button size="sm" variant="outline" className="h-8 gap-1 bg-white" onClick={() => nav({ to: "/admin/usuarios/novo" })}>
          <Plus size={14} /> Novo
        </Button>
        <Button size="sm" variant="outline" className="h-8 gap-1 bg-white text-rose-700 hover:text-rose-700 disabled:text-slate-400" disabled={selected.size === 0} onClick={() => setConfirmDel(true)}>
          <Trash2 size={14} /> Excluir
        </Button>
        <div className="relative">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Texto para Pesquisar..." className="h-8 w-64 pr-8 text-sm" />
          <Search size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="h-8 gap-1 bg-white">
              <Download size={14} /> Exportar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => exportCSV(exportRows, exportCols, "usuarios.csv")}>
              <FileText size={14} className="mr-2" /> Arquivo CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportXLSX(exportRows, exportCols, "usuarios.xls", "xls")}>
              <FileSpreadsheet size={14} className="mr-2" /> Arquivo Excel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportXLSX(exportRows, exportCols, "usuarios.xlsx", "xlsx")}>
              <FileType2 size={14} className="mr-2" /> Arquivo XLSX
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="ml-auto">
          <Button size="sm" variant="ghost" className="h-8 gap-1" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>

      <DataGrid
        rows={data}
        columns={columns}
        rowId={(r) => r.id}
        selected={selected}
        onSelectedChange={setSelected}
        search={search}
        onFilteredRowsChange={setFilteredRows}
        emptyMessage={isFetching ? "Carregando..." : "Nenhum usuário encontrado."}
      />

      <AlertDialog open={confirmDel} onOpenChange={setConfirmDel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selected.size} usuário(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente e remove os usuários selecionados do sistema, incluindo suas credenciais de acesso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} className="bg-rose-600 hover:bg-rose-700">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}