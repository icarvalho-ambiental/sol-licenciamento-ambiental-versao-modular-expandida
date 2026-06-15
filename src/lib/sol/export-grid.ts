import * as XLSX from "xlsx";

export type ExportColumn<T> = { key: keyof T | string; label: string; get?: (row: T) => string | number | boolean | null | undefined };

function val<T>(row: T, col: ExportColumn<T>): string {
  const raw = col.get ? col.get(row) : (row as any)[col.key as string];
  if (raw === null || raw === undefined) return "";
  if (typeof raw === "boolean") return raw ? "Sim" : "Não";
  return String(raw);
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportCSV<T>(rows: T[], cols: ExportColumn<T>[], filename = "export.csv") {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const header = cols.map((c) => esc(c.label)).join(";");
  const body = rows.map((r) => cols.map((c) => esc(val(r, c))).join(";")).join("\n");
  const csv = "\uFEFF" + header + "\n" + body;
  download(new Blob([csv], { type: "text/csv;charset=utf-8;" }), filename);
}

export function exportXLSX<T>(rows: T[], cols: ExportColumn<T>[], filename = "export.xlsx", bookType: "xlsx" | "xls" = "xlsx") {
  const data = [cols.map((c) => c.label), ...rows.map((r) => cols.map((c) => val(r, c)))];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Dados");
  const out = XLSX.write(wb, { type: "array", bookType });
  const mime = bookType === "xlsx"
    ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    : "application/vnd.ms-excel";
  download(new Blob([out], { type: mime }), filename);
}