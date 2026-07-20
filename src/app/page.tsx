import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { homePathForRole } from "@/lib/roles";

export default async function HomePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  redirect(homePathForRole(user.role));
}
