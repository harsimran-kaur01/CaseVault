"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/app/components/PageHeader";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import ErrorMessage from "@/app/components/ErrorMessage";
import Badge from "@/app/components/Badge";
import Modal from "@/app/components/Modal";
import FormField, { inputClass, selectClass } from "@/app/components/FormField";

interface Assignment {
  assignment_id: number;
  case_id: number;
  investigator_id: number;
  date_assigned: string | null;
  role: string | null;
  status: string | null;
}

function statusVariant(s: string): "success" | "warning" | "danger" | "neutral" {
  if (s === "active") return "success";
  if (s === "completed") return "warning";
  if (s === "removed") return "danger";
  return "neutral";
}

const EMPTY = { case_id: "", investigator_id: "", date_assigned: "", role: "", status: "active" };

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
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
      const res = await fetch("/api/assignments");
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed to load assignments"); return; }
      setAssignments(json.assignments ?? []); setTotal(json.total ?? 0);
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setFormError("");
    try {
      const body: Record<string, unknown> = {
        case_id: Number(form.case_id),
        investigator_id: Number(form.investigator_id),
      };
      if (form.date_assigned) body.date_assigned = form.date_assigned;
      if (form.role) body.role = form.role;
      if (form.status) body.status = form.status;

      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) { setFormError(json.error ?? "Failed to create assignment"); return; }
      setShowCreate(false); setForm(EMPTY); load();
    } catch { setFormError("Network error"); }
    finally { setSaving(false); }
  }

  const filtered = assignments.filter(a => {
    const q = search.toLowerCase();
    return (a.status ?? "").toLowerCase().includes(q) ||
      (a.role ?? "").toLowerCase().includes(q) ||
      String(a.case_id).includes(q) ||
      String(a.investigator_id).includes(q);
  });

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader title="Assignments" description={`${total} assignment${total !== 1 ? "s" : ""}`}
        action={
          <button onClick={() => { setForm(EMPTY); setFormError(""); setShowCreate(true); }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Assignment
          </button>
        }
      />

      <div className="mb-5">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by status, role, case ID, or investigator ID…"
          className="w-full max-w-sm bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white
                     text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-5 py-3 text-gray-400 font-medium">ID</th>
                <th className="text-left px-5 py-3 text-gray-400 font-medium">Case ID</th>
                <th className="text-left px-5 py-3 text-gray-400 font-medium">Investigator ID</th>
                <th className="text-left px-5 py-3 text-gray-400 font-medium">Role</th>
                <th className="text-left px-5 py-3 text-gray-400 font-medium">Status</th>
                <th className="text-left px-5 py-3 text-gray-400 font-medium">Date Assigned</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-gray-600">
                  {search ? "No assignments match your search" : "No assignments found"}
                </td></tr>
              )}
              {filtered.map(a => (
                <tr key={a.assignment_id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="px-5 py-3 font-mono text-blue-400 text-xs">#{a.assignment_id}</td>
                  <td className="px-5 py-3 text-gray-300">Case {a.case_id}</td>
                  <td className="px-5 py-3 text-gray-300">Person {a.investigator_id}</td>
                  <td className="px-5 py-3">
                    {a.role ? <Badge text={a.role} variant="info" /> : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-5 py-3">
                    {a.status ? <Badge text={a.status} variant={statusVariant(a.status)} /> : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-5 py-3 text-gray-400 whitespace-nowrap">
                    {a.date_assigned ? new Date(a.date_assigned).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <Modal title="New Assignment" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <FormField label="Case ID" required>
              <input type="number" min={1} value={form.case_id} onChange={e => setForm(f => ({ ...f, case_id: e.target.value }))}
                placeholder="e.g. 1" className={inputClass()} required />
            </FormField>
            <FormField label="Investigator Person ID" required>
              <input type="number" min={1} value={form.investigator_id} onChange={e => setForm(f => ({ ...f, investigator_id: e.target.value }))}
                placeholder="e.g. 2" className={inputClass()} required />
            </FormField>
            <FormField label="Date Assigned">
              <input type="date" value={form.date_assigned} onChange={e => setForm(f => ({ ...f, date_assigned: e.target.value }))}
                className={inputClass()} />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Role">
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className={selectClass()}>
                  <option value="">None</option>
                  <option value="lead">Lead</option>
                  <option value="support">Support</option>
                  <option value="supervisor">Supervisor</option>
                </select>
              </FormField>
              <FormField label="Status">
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={selectClass()}>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="removed">Removed</option>
                </select>
              </FormField>
            </div>
            {formError && <p className="text-sm text-red-400 bg-red-950/50 border border-red-800 rounded-lg px-3 py-2">{formError}</p>}
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
                {saving ? "Saving…" : "Create Assignment"}
              </button>
              <button type="button" onClick={() => setShowCreate(false)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-2.5 rounded-lg text-sm transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
