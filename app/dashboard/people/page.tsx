"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/app/components/PageHeader";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import ErrorMessage from "@/app/components/ErrorMessage";
import Modal from "@/app/components/Modal";
import FormField, { inputClass, selectClass, SubmitRow } from "@/app/components/FormField";
import { Table, Th, Td, EmptyRow, SearchBar, AddButton } from "@/app/components/Table";

interface Person {
  person_id: number; first_name: string; last_name: string; full_name: string;
  date_of_birth: string | null; gender: string | null; email: string | null; phone_no: string | null;
}

const EMPTY = { first_name: "", middle_name: "", last_name: "", date_of_birth: "", gender: "", email: "", phone_no: "" };

export default function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/people");
      const j = await res.json();
      if (!res.ok) { setError(j.error ?? "Failed"); return; }
      setPeople(j.people ?? []); setTotal(j.total ?? 0);
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setFormError("");
    try {
      const body: Record<string, unknown> = { first_name: form.first_name, last_name: form.last_name };
      if (form.middle_name) body.middle_name = form.middle_name;
      if (form.date_of_birth) body.date_of_birth = form.date_of_birth;
      if (form.gender) body.gender = form.gender;
      if (form.email) body.email = form.email;
      if (form.phone_no) body.phone_no = form.phone_no;
      const res = await fetch("/api/people", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await res.json();
      if (!res.ok) { setFormError(j.error ?? "Failed"); return; }
      setShowCreate(false); setForm(EMPTY); load();
    } catch { setFormError("Network error"); }
    finally { setSaving(false); }
  }

  const filtered = people.filter(p => {
    const q = search.toLowerCase();
    return (p.full_name ?? "").toLowerCase().includes(q) || (p.email ?? "").toLowerCase().includes(q) || (p.phone_no ?? "").toLowerCase().includes(q);
  });

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader title="People" description={`${total} on record`}
        action={<AddButton label="Add Person" onClick={() => { setForm(EMPTY); setFormError(""); setShowCreate(true); }} />} />
      <SearchBar value={search} onChange={setSearch} placeholder="Search by name, email, or phone…" />

      <Table>
        <thead><tr className="border-b border-gray-800">
          <Th>Name</Th><Th>Gender</Th><Th>Date of Birth</Th><Th>Email</Th><Th>Phone</Th>
        </tr></thead>
        <tbody className="divide-y divide-gray-800/50">
          {filtered.length === 0 && <EmptyRow cols={5} message={search ? "No people match your search" : "No people found"} />}
          {filtered.map(p => (
            <tr key={p.person_id} className="hover:bg-gray-800/30">
              <Td>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center shrink-0 text-xs font-bold text-gray-300">
                    {(p.first_name?.[0] ?? "?").toUpperCase()}{(p.last_name?.[0] ?? "").toUpperCase()}
                  </div>
                  <span className="text-gray-100 font-medium">{p.full_name}</span>
                </div>
              </Td>
              <Td muted className="capitalize">{p.gender ?? "—"}</Td>
              <Td muted>{p.date_of_birth ? new Date(p.date_of_birth).toLocaleDateString() : "—"}</Td>
              <Td><span className="text-gray-300">{p.email ?? <span className="text-gray-700">—</span>}</span></Td>
              <Td mono><span className="text-gray-400">{p.phone_no ?? <span className="text-gray-700">—</span>}</span></Td>
            </tr>
          ))}
        </tbody>
      </Table>

      {showCreate && (
        <Modal title="Add Person" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="First Name" required><input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} className={inputClass()} required maxLength={50} /></FormField>
              <FormField label="Last Name" required><input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} className={inputClass()} required maxLength={50} /></FormField>
            </div>
            <FormField label="Middle Name"><input value={form.middle_name} onChange={e => setForm(f => ({ ...f, middle_name: e.target.value }))} className={inputClass()} maxLength={50} /></FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Date of Birth"><input type="date" value={form.date_of_birth} onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} className={inputClass()} /></FormField>
              <FormField label="Gender">
                <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))} className={selectClass()}>
                  <option value="">Select…</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </FormField>
            </div>
            <FormField label="Email"><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputClass()} maxLength={120} /></FormField>
            <FormField label="Phone" hint="+91XXXXXXXXXX"><input type="tel" value={form.phone_no} onChange={e => setForm(f => ({ ...f, phone_no: e.target.value }))} placeholder="+91XXXXXXXXXX" className={inputClass()} /></FormField>
            {formError && <p className="text-sm text-red-400 bg-red-950/40 border border-red-800/40 rounded-xl px-3 py-2">{formError}</p>}
            <SubmitRow saving={saving} label="Add Person" onCancel={() => setShowCreate(false)} />
          </form>
        </Modal>
      )}
    </div>
  );
}
