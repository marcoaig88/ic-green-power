export function fullName(user: { name: string; surname?: string | null }) {
  return [user.name, user.surname]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
}
