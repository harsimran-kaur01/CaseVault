"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/app/components/PageHeader";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import ErrorMessage from "@/app/components/ErrorMessage";
import Badge from "@/app/components/Badge";
import Modal from "@/app/components/Modal";
import FormField, { inputClass, selectClass, SubmitRow } from "@/app/components/FormField";
import { Table, Th, Td, EmptyRow, SearchBar, AddButton } from "@/app/components/Table";

interface Evidence {
  evidence_id: number; case_id: number; evidence_code: string; description: string;
  evidence_type: string; condition_status: string; date_collected: string; sealed: boolean;
  notes: string | null;
}

function conditionVariant(s: string): "success" | "warning" | "danger" | "neutral" {
  const l = (s ?? "").toLowerCase();
  if (l === "intact") return "success";
  if (l === "damaged" || l === "degraded" || l === "contaminated") return "warning";
  if (l === "unknown") return "neutral";
  return "neutral";
}

const EMPTY = { case_id: "", evidence_code: "", description: "", evidence_type: "physical", condition_status: "intact", date_collected: "", sealed: false, collected_by: "", notes: "" };

export default function EvidencePage() {
  const [evidence, setEvidence] = useState<Evidence[]>([]);
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
      const res = await fetch("/api/evidence");
      const j = await res.json();
      if (!res.ok) { setError(j.error ?? "Failed"); return; }
      setEvidence(j.evidence ?? []); setTotal(j.total ?? 0);
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setFormError("");
    try {
      const body: Record<string, unknown> = {
        case_id: Number(form.case_id), evidence_code: form.evidence_code, description: form.description,
        evidence_type: form.evidence_type, condition_status: form.condition_status,
        date_collected: new Date(form.date_collected).toISOString(), sealed: form.sealed,
      };
      if (form.collected_by) body.collected_by = Number(form.collected_by);
      if (form.notes) body.notes = form.notes;
      const res = await fetch("/api/evidence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await res.json();
      if (!res.ok) { setFormError(j.error ?? "Failed"); return; }
      setShowCreate(false); setForm(EMPTY); load();
    } catch { setFormError("Network error"); }
    finally { setSaving(false); }
  }

  const filtered = evidence.filter(e =>
    e.evidence_code.toLowerCase().includes(search.toLowerCase()) ||
    e.description.toLowerCase().includes(search.toLowerCase()) ||
    e.evidence_type.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader title="Evidence" description={`${total} item${total !== 1 ? "s" : ""} on record`}
        action={<AddButton label="Register Evidence" onClick={() => { setForm(EMPTY); setFormError(""); setShowCreate(true); }} />} />
      <SearchBar value={search} onChange={setSearch} placeholder="Search by code, type, or description…" />

      <Table>
        <thead><tr className="border-b border-gray-800">
          <Th>Code</Th><Th>Case</Th><Th>Description</Th><Th>Type</Th><Th>Condition</Th><Th>Collected</Th><Th>Sealed</Th>
        </tr></thead>
        <tbody className="divide-y divide-gray-800/50">
          {filtered.length === 0 && <EmptyRow cols={7} message={search ? "No evidence matches" : "No evidence registered"} />}
          {filtered.map(ev => (
            <tr key={ev.evidence_id} className="hover:bg-gray-800/30">
              <Td mono><span className="text-blue-400">{ev.evidence_code}</span></Td>
              <Td muted>Case {ev.case_id}</Td>
              <Td><p className="max-w-xs truncate text-gray-200">{ev.description}</p></Td>
              <Td><span className="capitalize text-gray-300">{ev.evidence_type}</span></Td>
              <Td><Badge text={ev.condition_status} variant={conditionVariant(ev.condition_status)} /></Td>
              <Td muted>{ev.date_collected ? new Date(ev.date_collected).toLocaleDateString() : "—"}</Td>
              <Td>
                {ev.sealed
                  ? <span className="inline-flex items-center gap-1 text-green-400 text-xs font-medium">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      Sealed
                    </span>
                  : <span className="text-gray-600 text-xs">Unsealed</span>}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>

      {showCreate && (
        <Modal title="Register Evidence" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Case ID" required><input type="number" min={1} value={form.case_id} onChange={e => setForm(f => ({ ...f, case_id: e.target.value }))} placeholder="1" className={inputClass()} required /></FormField>
              <FormField label="Evidence Code" required hint="EV-YYYY-NNN"><input value={form.evidence_code} onChange={e => setForm(f => ({ ...f, evidence_code: e.target.value }))} placeholder="EV-2026-001" className={inputClass()} required /></FormField>
            </div>
            <FormField label="Description" required>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className={inputClass() + " resize-none"} required />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Type" required>
                <select value={form.evidence_type} onChange={e => setForm(f => ({ ...f, evidence_type: e.target.value }))} className={selectClass()} required>
                  {["physical","biological","digital","documentary","weapon","trace","other"].map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                </select>
              </FormField>
              <FormField label="Condition">
                <select value={form.condition_status} onChange={e => setForm(f => ({ ...f, condition_status: e.target.value }))} className={selectClass()}>
                  {["intact","damaged","degraded","contaminated","unknown"].map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                </select>
              </FormField>
            </div>
            <FormField label="Date & Time Collected" required>
              <input type="datetime-local" value={form.date_collected} onChange={e => setForm(f => ({ ...f, date_collected: e.target.value }))} className={inputClass()} required />
            </FormField>
            <FormField label="Collector Person ID" hint="Required if admin — must be an active investigator on the case">
              <input type="number" min={1} value={form.collected_by} onChange={e => setForm(f => ({ ...f, collected_by: e.target.value }))} placeholder="Leave blank to use your account" className={inputClass()} />
            </FormField>
            <FormField label="Notes">
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className={inputClass() + " resize-none"} />
            </FormField>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.sealed} onChange={e => setForm(f => ({ ...f, sealed: e.target.checked }))} className="w-4 h-4 rounded accent-blue-500" />
              <span className="text-sm text-gray-300">Mark as sealed</span>
            </label>
            {formError && <p className="text-sm text-red-400 bg-red-950/40 border border-red-800/40 rounded-xl px-3 py-2">{formError}</p>}
            <SubmitRow saving={saving} label="Register Evidence" onCancel={() => setShowCreate(false)} />
          </form>
        </Modal>
      )}
    </div>
  );
}
