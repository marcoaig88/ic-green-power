import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LoginPicker } from "@/components/LoginPicker";

export default async function LoginPage() {
  const session = await getSessionUser();
  if (session) redirect("/expenses");

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  // Admin first (role "admin" < "employee" alphabetically already almost - force sort)
  const sorted = [...users].sort((a, b) => {
    if (a.role === b.role) return a.name.localeCompare(b.name, "it");
    return a.role === "admin" ? -1 : 1;
  });

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-4 py-10">
      <div className="mb-8">
        <h1 className="brand-title text-5xl sm:text-6xl">IC Green Power</h1>
        <p className="brand-subtitle mt-3 text-base tracking-wide">
          Energia solare · note spese del team
        </p>
      </div>

      <LoginPicker users={sorted} />
    </div>
  );
}
