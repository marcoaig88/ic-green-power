"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/format";
import { fullName } from "@/lib/user";
import {
  ASSIGNABLE_ROLE_OPTIONS,
  ROLES,
  roleLabel,
  type AssignableRole,
  isAssignableRole,
} from "@/lib/roles";
import {
  AciVehiclePicker,
  type AciVehicleOption,
} from "@/components/AciVehiclePicker";

export type TeamMember = {
  id: string;
  name: string;
  surname: string;
  email: string;
  role: string;
  aciVehicleRateId: string | null;
  aciVehicleRate: {
    id: string;
    year: number;
    brand: string;
    model: string;
    fuelType: string;
    ratePerKm: number;
  } | null;
};

function toAssignableRole(role: string): AssignableRole {
  if (isAssignableRole(role)) return role;
  if (role === ROLES.responsabile) return ROLES.coo;
  return ROLES.employee;
}

export function TeamAdmin({ initialUsers }: { initialUsers: TeamMember[] }) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AssignableRole>(ROLES.employee);
  const [vehicle, setVehicle] = useState<AciVehicleOption | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSurname, setEditSurname] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<AssignableRole>(ROLES.employee);
  const [editVehicle, setEditVehicle] = useState<AciVehicleOption | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const selectedCreateLabel = useMemo(() => {
    if (!vehicle) return null;
    return `${vehicle.brand} ${vehicle.model} · ${formatMoney(vehicle.ratePerKm)}/km`;
  }, [vehicle]);

  function sortUsers(list: TeamMember[]) {
    return [...list].sort((a, b) => {
      const bySurname = a.surname.localeCompare(b.surname, "it");
      if (bySurname !== 0) return bySurname;
      return a.name.localeCompare(b.name, "it");
    });
  }

  async function createEmployee(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          surname,
          email,
          role,
          aciVehicleRateId: vehicle?.id || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Creazione non riuscita");
      setUsers((prev) => sortUsers([...prev, data.user as TeamMember]));
      setName("");
      setSurname("");
      setEmail("");
      setRole(ROLES.employee);
      setVehicle(null);
      setMessage("Utente creato (password demo: password123).");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(member: TeamMember) {
    setEditingId(member.id);
    setEditName(member.name);
    setEditSurname(member.surname);
    setEditEmail(member.email);
    setEditRole(toAssignableRole(member.role));
    setEditVehicle(
      member.aciVehicleRate
        ? ({
            ...member.aciVehicleRate,
            production: "",
            vehicleType: "autoveicolo",
          } as AciVehicleOption)
        : null,
    );
  }

  async function saveMember(userId: string) {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          surname: editSurname,
          email: editEmail,
          role: editRole,
          aciVehicleRateId: editVehicle?.id || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Salvataggio non riuscito");
      setUsers((prev) =>
        sortUsers(prev.map((u) => (u.id === userId ? (data.user as TeamMember) : u))),
      );
      setEditingId(null);
      setEditVehicle(null);
      setMessage("Utente aggiornato.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={createEmployee}
        className="space-y-4 rounded-xl border border-line bg-white/80 p-5"
      >
        <div>
          <h2 className="font-display text-lg font-bold text-brand-deep">
            Nuovo utente
          </h2>
          <p className="mt-1 text-sm text-muted">
            Crea l&apos;account, assegna il ruolo e il veicolo ACI.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">Nome</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">Cognome</span>
            <input
              required
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
              className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">Ruolo</span>
            <select
              required
              value={role}
              onChange={(e) => setRole(e.target.value as AssignableRole)}
              className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
            >
              {ASSIGNABLE_ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <AciVehiclePicker
          value={vehicle?.id || null}
          selectedLabel={selectedCreateLabel}
          onChange={setVehicle}
        />

        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
        >
          {saving ? "Salvataggio…" : "Crea utente"}
        </button>
      </form>

      {(error || message) && (
        <p className={`text-sm ${error ? "text-danger" : "text-brand-deep"}`}>
          {error || message}
        </p>
      )}

      <section className="rounded-xl border border-line bg-white/80 p-5">
        <h2 className="font-display text-lg font-bold text-brand-deep">
          Utenti ({users.length})
        </h2>
        <ul className="mt-4 divide-y divide-line/70">
          {users.length === 0 ? (
            <li className="py-6 text-sm text-muted">Nessun utente ancora.</li>
          ) : (
            users.map((member) => (
              <li key={member.id} className="py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">
                      {fullName(member)}{" "}
                      <span className="ml-1 rounded-md bg-brand-soft px-2 py-0.5 text-xs font-bold text-brand-deep">
                        {roleLabel(member.role)}
                      </span>
                    </p>
                    <p className="text-xs text-muted">{member.email}</p>
                    <p className="mt-1 text-sm text-muted">
                      {member.aciVehicleRate
                        ? `${member.aciVehicleRate.brand} ${member.aciVehicleRate.model} · ${formatMoney(member.aciVehicleRate.ratePerKm)}/km`
                        : "Nessun veicolo ACI assegnato"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (editingId === member.id) {
                        setEditingId(null);
                        setEditVehicle(null);
                      } else {
                        startEdit(member);
                      }
                    }}
                    className="rounded-md border border-line bg-white px-3 py-1.5 text-sm font-semibold text-ink hover:border-brand"
                  >
                    {editingId === member.id ? "Chiudi" : "Modifica"}
                  </button>
                </div>

                {editingId === member.id && (
                  <div className="mt-3 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <label className="block">
                        <span className="mb-1 block text-xs font-semibold text-muted">
                          Nome
                        </span>
                        <input
                          required
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-semibold text-muted">
                          Cognome
                        </span>
                        <input
                          required
                          value={editSurname}
                          onChange={(e) => setEditSurname(e.target.value)}
                          className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-semibold text-muted">
                          Email
                        </span>
                        <input
                          type="email"
                          required
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-semibold text-muted">
                          Ruolo
                        </span>
                        <select
                          required
                          value={editRole}
                          onChange={(e) =>
                            setEditRole(e.target.value as AssignableRole)
                          }
                          className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
                        >
                          {ASSIGNABLE_ROLE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <AciVehiclePicker
                      value={editVehicle?.id || null}
                      selectedLabel={
                        editVehicle
                          ? `${editVehicle.brand} ${editVehicle.model} · ${formatMoney(editVehicle.ratePerKm)}/km`
                          : null
                      }
                      onChange={setEditVehicle}
                    />
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => saveMember(member.id)}
                      className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
                    >
                      Salva modifiche
                    </button>
                  </div>
                )}
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
