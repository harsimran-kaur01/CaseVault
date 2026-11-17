"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/app/components/PageHeader";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import ErrorMessage from "@/app/components/ErrorMessage";
import Badge from "@/app/components/Badge";
import Modal from "@/app/components/Modal";
import FormField, { inputClass, selectClass, SubmitRow } from "@/app/components/FormField";
import { Table, Th, Td, EmptyRow, SearchBar, AddButton } from "@/app/components/Table";

interface CaseStatus { status_id: number; status_name: string; }
interface Location { location_id: number; address: string; city: string; }
interface Case {
  case_id: number; case_number: string; title: string; description: string | null;
  date_opened: string; date_closed: string | null; status_id: number; location_id: number | null;
  case_status: { status_name: string } | null;
}

function statusVariant(name: string): "success" | "warning" | "info" | "neutral" {
  const l = (name ?? "").toLowerCase();
  if (l.includes("open")) return "info";
  if (l.includes("investigation")) return "warning";
  if (l.includes("closed")) return "success";
  return "neutral";
}

const EMPTY = { case_number: "", title: "", description: "", status_id: "", location_id: "" };

export default function CasesPage() {
  const router = useRouter();
  const [cases, setCases] = useState<Case[]>([]);
  const [statuses, setStatuses] = useState<CaseStatus[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editCase, setEditCase] = useState<Case | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true); setError("");
    try {
      const [cRes, sRes, lRes] = await Promise.all([fetch("/api/cases"), fetch("/api/case-statuses"), fetch("/api/locations")]);
      const [cj, sj, lj] = await Promise.all([cRes.json(), sRes.json(), lRes.json()]);
      if (!cRes.ok) { setError(cj.error ?? "Failed to load"); return; }
      setCases(cj.cases ?? []); setTotal(cj.total ?? 0);
      setStatuses(sj.statuses ?? []); setLocations(lj.locations ?? []);
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function openEdit(c: Case) {
    setForm({ case_number: c.case_number, title: c.title, description: c.description ?? "", status_id: String(c.status_id), location_id: c.location_id ? String(c.location_id) : "" });
    setFormError(""); setEditCase(c);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setFormError("");
    try {
      const res = await fetch("/api/cases", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ case_number: form.case_number, title: form.title, description: form.description || null, status_id: Number(form.status_id), location_id: form.location_id ? Number(form.location_id) : null }) });
      const j = await res.json();
      if (!res.ok) { setFormError(j.error ?? "Failed"); return; }
      setShowCreate(false); setForm(EMPTY); load();
    } catch { setFormError("Network error"); }
    finally { setSaving(false); }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault(); if (!editCase) return;
    setSaving(true); setFormError("");
    try {
      const res = await fetch(`/api/cases/${editCase.case_id}`, { method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.title, description: form.description || null, status_id: Number(form.status_id), location_id: form.location_id ? Number(form.location_id) : null }) });
      const j = await res.json();
      if (!res.ok) { setFormError(j.error ?? "Failed"); return; }
      setEditCase(null); load();
    } catch { setFormError("Network error"); }
    finally { setSaving(false); }
  }

  const filtered = cases.filter(c =>
    c.case_number.toLowerCase().includes(search.toLowerCase()) ||
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={load} />;

  const CaseForm = ({ onSubmit, submitLabel }: { onSubmit: (e: React.FormEvent) => void; submitLabel: string }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      {!editCase && (
        <FormField label="Case Number" required hint="Format: CS-YYYY-NNNN">
          <input value={form.case_number} onChange={e => setForm(f => ({ ...f, case_number: e.target.value }))}
            placeholder="CS-2026-0010" className={inputClass()} required />
        </FormField>
      )}
      <FormField label="Title" required>
        <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          className={inputClass()} required maxLength={150} />
      </FormField>
      <FormField label="Description">
        <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          rows={3} className={inputClass() + " resize-none"} />
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Status" required>
          <select value={form.status_id} onChange={e => setForm(f => ({ ...f, status_id: e.target.value }))} className={selectClass()} required>
            <option value="">Select…</option>
            {statuses.map(s => <option key={s.status_id} value={s.status_id}>{s.status_name}</option>)}
          </select>
        </FormField>
        <FormField label="Location">
          <select value={form.location_id} onChange={e => setForm(f => ({ ...f, location_id: e.target.value }))} className={selectClass()}>
            <option value="">None</option>
            {locations.map(l => <option key={l.location_id} value={l.location_id}>{l.city}</option>)}
          </select>
        </FormField>
      </div>
      {formError && <p className="text-sm text-red-400 bg-red-950/40 border border-red-800/40 rounded-xl px-3 py-2">{formError}</p>}
      <SubmitRow saving={saving} label={submitLabel} onCancel={() => { setShowCreate(false); setEditCase(null); }} />
    </form>
  );

  return (
    <div>
      <PageHeader title="Cases" description={`${total} total`}
        action={<AddButton label="New Case" onClick={() => { setForm(EMPTY); setFormError(""); setShowCreate(true); }} />} />
      <SearchBar value={search} onChange={setSearch} placeholder="Search case number or title…" />

      <Table>
        <thead><tr className="border-b border-gray-800">
          <Th>Case #</Th><Th>Title</Th><Th>Status</Th><Th>Opened</Th><Th>Closed</Th><Th></Th>
        </tr></thead>
        <tbody className="divide-y divide-gray-800/50">
          {filtered.length === 0 && <EmptyRow cols={6} message={search ? "No cases match your search" : "No cases found"} />}
          {filtered.map(c => (
            <tr key={c.case_id} className="hover:bg-gray-800/30 cursor-pointer"
              onClick={e => { if ((e.target as HTMLElement).closest("button")) return; router.push(`/dashboard/cases/${c.case_id}`); }}>
              <Td mono><span className="text-blue-400">{c.case_number}</span></Td>
              <Td>
                <div>
                  <p className="text-gray-100 font-medium max-w-xs truncate">{c.title}</p>
                  {c.description && <p className="text-gray-500 text-xs mt-0.5 max-w-xs truncate">{c.description}</p>}
                </div>
              </Td>
              <Td><Badge text={c.case_status?.status_name ?? `Status ${c.status_id}`} variant={statusVariant(c.case_status?.status_name ?? "")} /></Td>
              <Td muted>{c.date_opened ? new Date(c.date_opened).toLocaleDateString() : "—"}</Td>
              <Td muted>{c.date_closed ? new Date(c.date_closed).toLocaleDateString() : <span className="text-gray-700">Ongoing</span>}</Td>
              <Td>
                <button onClick={() => openEdit(c)}
                  className="text-xs text-gray-500 hover:text-blue-400 bg-gray-800/60 hover:bg-blue-950/40 border border-gray-700/40 hover:border-blue-800/40 px-3 py-1.5 rounded-lg">
                  Edit
                </button>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>

      {showCreate && <Modal title="New Case" onClose={() => setShowCreate(false)}><CaseForm onSubmit={handleCreate} submitLabel="Create Case" /></Modal>}
      {editCase && <Modal title={`Edit — ${editCase.case_number}`} onClose={() => setEditCase(null)}><CaseForm onSubmit={handleUpdate} submitLabel="Save Changes" /></Modal>}
    </div>
  );
}
