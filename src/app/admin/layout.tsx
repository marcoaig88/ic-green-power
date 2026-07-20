import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { canAccessAdminArea, canApproveExpenses } from "@/lib/roles";
import { countApprovablePending } from "@/lib/pending-approvals";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!canAccessAdminArea(user.role)) redirect("/expenses");

  const pendingApprovalsCount = canApproveExpenses(user.role)
    ? await countApprovablePending({ id: user.id, role: user.role })
    : 0;

  return (
    <AppShell user={user} pendingApprovalsCount={pendingApprovalsCount}>
      {children}
    </AppShell>
  );
}
