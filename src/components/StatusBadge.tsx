import { STATUS_LABELS } from "@/lib/format";

const styles: Record<string, string> = {
  draft: "bg-bg-accent text-muted",
  submitted: "bg-brand-soft text-brand-deep",
  approved: "bg-[#d9f0df] text-[#14532d]",
  rejected: "bg-[#fde8e8] text-danger",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${styles[status] || styles.draft}`}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}
