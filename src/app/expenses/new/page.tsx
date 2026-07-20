import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { homePathForRole } from "@/lib/roles";
import { NewExpenseClient } from "@/components/NewExpenseClient";

export default async function NewExpensePage() {
  const session = await getSessionUser();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      aciVehicleRateId: true,
      aciVehicleRate: {
        select: { brand: true, model: true, ratePerKm: true, year: true },
      },
    },
  });

  const companyRatePerKm = user?.aciVehicleRate?.ratePerKm ?? null;
  const vehicleLabel = user?.aciVehicleRate
    ? `${user.aciVehicleRate.brand} ${user.aciVehicleRate.model} (ACI ${user.aciVehicleRate.year})`
    : null;

  return (
    <NewExpenseClient
      companyRatePerKm={companyRatePerKm}
      vehicleLabel={vehicleLabel}
      aciVehicleRateId={user?.aciVehicleRateId || null}
      homeHref={homePathForRole(session.role)}
    />
  );
}
