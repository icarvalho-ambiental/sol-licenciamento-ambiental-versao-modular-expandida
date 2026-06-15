import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/sol/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Eye, Pencil, Plus, Search, Trash2, Inbox } from "lucide-react";

export type ListColumn<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
};

export type ListAction<T> = {
  label: string;
  icon?: ReactNode;
  /** Visible when this returns true (default: always). */
  show?: (row: T) => boolean;
} & (
  | { type: "link"; to: (row: T) => { to: string; params?: Record<string, string> } }
  | { type: "button"; onClick: (row: T) => void; variant?: "ghost" | "destructive" }
);

export type ListPageProps<T> = {
  title: string;
  subtitle?: string;
  breadcrumb?: string[];
  /** Botão "Novo" padrão no canto superior direito. */
  newAction?: { to: string; label: string; visible?: boolean };
  /** Conteúdo extra no header, à direita do botão Novo. */
  extraActions?: ReactNode;
  data: T[] | undefined;
  isLoading?: boolean;
  error?: Error | null;
  searchPlaceholder?: string;
  /** Função de filtro pelo termo de busca. */
  filter?: (row: T, term: string) => boolean;
  columns: ListColumn<T>[];
  rowKey: (row: T) => string;
  /** Ações por linha (Ver, Editar, Excluir). */
  actions?: {
    view?: (row: T) => { to: string; params?: Record<string, string> };
    edit?: (row: T) => { to: string; params?: Record<string, string> };
    /** Se fornecido, mostra botão de exclusão com confirmação. */
    delete?: {
      onConfirm: (row: T) => Promise<void> | void;
      label?: (row: T) => string;
      disabled?: (row: T) => boolean;
    };
  };
  /** Conteúdo customizado quando lista vazia (override). */
  emptyState?: ReactNode;
  emptyMessage?: string;
};

export function ListPage<T>({
  title,
  subtitle,
  breadcrumb,
  newAction,
  extraActions,
  data,
  isLoading,
  error,
  searchPlaceholder = "Buscar...",
  filter,
  columns,
  rowKey,
  actions,
  emptyState,
  emptyMessage = "Nenhum registro cadastrado.",
}: ListPageProps<T>) {
  const [q, setQ] = useState("");
  const [deleting, setDeleting] = useState<{ row: T; busy: boolean } | null>(null);

  const rows = useMemo(() => {
    const list = data ?? [];
    if (!q || !filter) return list;
    return list.filter((r) => filter(r, q));
  }, [data, q, filter]);

  const hasActions = !!(actions?.view || actions?.edit || actions?.delete);

  async function confirmDelete() {
    if (!deleting || !actions?.delete) return;
    setDeleting({ ...deleting, busy: true });
    try {
      await actions.delete.onConfirm(deleting.row);
      setDeleting(null);
    } catch {
      setDeleting((d) => (d ? { ...d, busy: false } : d));
    }
  }

  return (
    <AppShell>
      <PageHeader
        title={title}
        subtitle={subtitle}
        breadcrumb={breadcrumb}
        actions={
          <div className="flex gap-2">
            {extraActions}
            {newAction && newAction.visible !== false && (
              <Link to={newAction.to}>
                <Button className="gap-2">
                  <Plus size={16} /> {newAction.label}
                </Button>
              </Link>
            )}
          </div>
        }
      />

      {filter && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder={searchPlaceholder}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {error ? (
            <div className="p-6 text-sm text-destructive">{error.message}</div>
          ) : isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Carregando…</div>
          ) : rows.length === 0 ? (
            emptyState ?? (
              <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
                <Inbox className="text-muted-foreground" size={36} />
                <p className="text-sm text-muted-foreground">{emptyMessage}</p>
                {newAction && newAction.visible !== false && (
                  <Link to={newAction.to}>
                    <Button size="sm" className="gap-2">
                      <Plus size={14} /> {newAction.label}
                    </Button>
                  </Link>
                )}
              </div>
            )
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    {columns.map((c) => (
                      <th key={c.key} className={`px-4 py-3 font-medium ${c.className ?? ""}`}>
                        {c.header}
                      </th>
                    ))}
                    {hasActions && <th className="px-4 py-3 text-right font-medium">Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={rowKey(row)} className="border-b last:border-0 hover:bg-accent/30">
                      {columns.map((c) => (
                        <td key={c.key} className={`px-4 py-3 ${c.className ?? ""}`}>
                          {c.render(row)}
                        </td>
                      ))}
                      {hasActions && (
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {actions?.view && (
                              <Link {...(actions.view(row) as any)}>
                                <Button size="sm" variant="ghost" title="Ver detalhes">
                                  <Eye size={14} />
                                </Button>
                              </Link>
                            )}
                            {actions?.edit && (
                              <Link {...(actions.edit(row) as any)}>
                                <Button size="sm" variant="ghost" title="Editar">
                                  <Pencil size={14} />
                                </Button>
                              </Link>
                            )}
                            {actions?.delete && (
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Excluir"
                                disabled={actions.delete.disabled?.(row)}
                                onClick={() => setDeleting({ row, busy: false })}
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 size={14} />
                              </Button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && !deleting?.busy && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting && actions?.delete?.label
                ? actions.delete.label(deleting.row)
                : "Esta ação não pode ser desfeita. Deseja realmente excluir este registro?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting?.busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
              disabled={deleting?.busy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting?.busy ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}