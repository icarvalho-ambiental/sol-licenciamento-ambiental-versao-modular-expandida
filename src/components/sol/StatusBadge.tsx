import { STATUS_COLORS } from "@/lib/sol/constants";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] ?? "bg-slate-100 text-slate-700 border-slate-200";
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", cls)}>
      {status}
    </span>
  );
}