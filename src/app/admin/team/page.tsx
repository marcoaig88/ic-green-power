import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TeamAdmin } from "@/components/TeamAdmin";
import { canManageUsers } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function AdminTeamPage() {
  const user = await getSessionUser();
  if (!user) return null;
  if (!canManageUsers(user.role)) redirect("/admin");

  const users = await prisma.user.findMany({
    where: { role: "employee" },
    orderBy: [{ surname: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      surname: true,
      email: true,
      aciVehicleRateId: true,
      aciVehicleRate: {
        select: {
          id: true,
          year: true,
          brand: true,
          model: true,
          fuelType: true,
          ratePerKm: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="brand-title brand-title--ink text-3xl sm:text-4xl">Dipendenti</h1>
        <p className="brand-subtitle brand-subtitle--ink mt-1 text-sm">
          Anagrafica team e veicolo ACI per i rimborsi chilometrici
        </p>
      </div>
      <TeamAdmin initialUsers={users} />
    </div>
  );
}
