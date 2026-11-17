"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/app/components/PageHeader";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import ErrorMessage from "@/app/components/ErrorMessage";
import Modal from "@/app/components/Modal";
import FormField, { inputClass, SubmitRow } from "@/app/components/FormField";
import { Table, Th, Td, EmptyRow, SearchBar, AddButton } from "@/app/components/Table";

interface Crime { crime_id: number; crime_type: string; description: string | null; }
const EMPTY = { crime_type: "", description: "" };

export default function CrimesPage() {
  const [crimes, setCrimes] = useState<Crime[]>([]);
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
      const res = await fetch("/api/crimes");
      const j = await res.json();
      if (!res.ok) { setError(j.error ?? "Failed"); return; }
      setCrimes(j.crimes ?? []); setTotal(j.total ?? 0);
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setFormError("");
    try {
      const res = await fetch("/api/crimes", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crime_type: form.crime_type, description: form.description || null }) });
      const j = await res.json();
      if (!res.ok) { setFormError(j.error ?? "Failed"); return; }
      setShowCreate(false); setForm(EMPTY); load();
    } catch { setFormError("Network error"); }
    finally { setSaving(false); }
  }

  const filtered = crimes.filter(c =>
    c.crime_type.toLowerCase().includes(search.toLowerCase()) ||
    (c.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader title="Crimes" description={`${total} on record`}
        action={<AddButton label="Add Crime" onClick={() => { setForm(EMPTY); setFormError(""); setShowCreate(true); }} />} />
      <SearchBar value={search} onChange={setSearch} placeholder="Search by type or description…" />

      <Table>
        <thead><tr className="border-b border-gray-800"><Th>ID</Th><Th>Type</Th><Th>Description</Th></tr></thead>
        <tbody className="divide-y divide-gray-800/50">
          {filtered.length === 0 && <EmptyRow cols={3} message={search ? "No crimes match" : "No crimes found"} />}
          {filtered.map(c => (
            <tr key={c.crime_id} className="hover:bg-gray-800/30">
              <Td mono><span className="text-blue-400">#{c.crime_id}</span></Td>
              <Td><span className="text-gray-100 font-medium">{c.crime_type}</span></Td>
              <Td muted><span className="max-w-lg truncate block">{c.description ?? "—"}</span></Td>
            </tr>
          ))}
        </tbody>
      </Table>

      {showCreate && (
        <Modal title="Add Crime" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <FormField label="Crime Type" required><input value={form.crime_type} onChange={e => setForm(f => ({ ...f, crime_type: e.target.value }))} placeholder="e.g. Robbery" className={inputClass()} required maxLength={60} /></FormField>
            <FormField label="Description"><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className={inputClass() + " resize-none"} /></FormField>
            {formError && <p className="text-sm text-red-400 bg-red-950/40 border border-red-800/40 rounded-xl px-3 py-2">{formError}</p>}
            <SubmitRow saving={saving} label="Add Crime" onCancel={() => setShowCreate(false)} />
          </form>
        </Modal>
      )}
    </div>
  );
}
