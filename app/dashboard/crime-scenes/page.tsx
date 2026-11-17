"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/app/components/PageHeader";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import ErrorMessage from "@/app/components/ErrorMessage";
import Modal from "@/app/components/Modal";
import FormField, { inputClass, SubmitRow } from "@/app/components/FormField";
import { Table, Th, Td, EmptyRow, SearchBar, AddButton } from "@/app/components/Table";

interface CrimeScene {
  crime_scene_id: number;
  case_id: number;
  location_id: number;
  scene_name: string;
  description: string | null;
  date_visited: string;
  visited_by: number;
  notes: string | null;
}

const EMPTY = {
  case_id: "", location_id: "", scene_name: "", description: "",
  date_visited: "", visited_by: "", notes: "",
};

export default function CrimeScenesPage() {
  const [scenes, setScenes] = useState<CrimeScene[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editScene, setEditScene] = useState<CrimeScene | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/crime-scenes");
      const j = await res.json();
      if (!res.ok) { setError(j.error ?? "Failed to load crime scenes"); return; }
      setScenes(j.crime_scenes ?? []); setTotal(j.total ?? 0);
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function openEdit(s: CrimeScene) {
    setForm({
      case_id: String(s.case_id),
      location_id: String(s.location_id),
      scene_name: s.scene_name,
      description: s.description ?? "",
      date_visited: s.date_visited ? s.date_visited.slice(0, 16) : "",
      visited_by: String(s.visited_by),
      notes: s.notes ?? "",
    });
    setFormError(""); setEditScene(s);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setFormError("");
    try {
      const body = {
        case_id: Number(form.case_id),
        location_id: Number(form.location_id),
        scene_name: form.scene_name,
        description: form.description || null,
        date_visited: new Date(form.date_visited).toISOString(),
        visited_by: Number(form.visited_by),
        notes: form.notes || null,
      };
      const res = await fetch("/api/crime-scenes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (!res.ok) { setFormError(j.error ?? "Failed to create"); return; }
      setShowCreate(false); setForm(EMPTY); load();
    } catch { setFormError("Network error"); }
    finally { setSaving(false); }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault(); if (!editScene) return;
    setSaving(true); setFormError("");
    try {
      const body: Record<string, unknown> = {};
      if (form.scene_name) body.scene_name = form.scene_name;
      if (form.description !== undefined) body.description = form.description || null;
      if (form.date_visited) body.date_visited = new Date(form.date_visited).toISOString();
      if (form.visited_by) body.visited_by = Number(form.visited_by);
      if (form.notes !== undefined) body.notes = form.notes || null;

      const res = await fetch(`/api/crime-scenes/${editScene.crime_scene_id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (!res.ok) { setFormError(j.error ?? "Failed to update"); return; }
      setEditScene(null); load();
    } catch { setFormError("Network error"); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/crime-scenes/${deleteId}`, { method: "DELETE" });
      const j = await res.json();
      if (!res.ok) { alert(j.error ?? "Delete failed"); return; }
      setDeleteId(null); load();
    } catch { alert("Network error"); }
    finally { setDeleting(false); }
  }

  const filtered = scenes.filter(s => {
    const q = search.toLowerCase();
    return s.scene_name.toLowerCase().includes(q) ||
      (s.description ?? "").toLowerCase().includes(q) ||
      String(s.case_id).includes(q);
  });

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader title="Crime Scenes" description={`${total} scene${total !== 1 ? "s" : ""} on record`}
        action={<AddButton label="Add Crime Scene" onClick={() => { setForm(EMPTY); setFormError(""); setShowCreate(true); }} />}
      />
      <SearchBar value={search} onChange={setSearch} placeholder="Search by name, description, or case ID…" />

      <Table>
        <thead>
          <tr className="border-b border-gray-800">
            <Th>ID</Th>
            <Th>Scene Name</Th>
            <Th>Case</Th>
            <Th>Date Visited</Th>
            <Th>Visited By</Th>
            <Th>Description</Th>
            <Th></Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/50">
          {filtered.length === 0 && (
            <EmptyRow cols={7} message={search ? "No crime scenes match your search" : "No crime scenes recorded"} />
          )}
          {filtered.map(s => (
            <tr key={s.crime_scene_id} className="hover:bg-gray-800/30">
              <Td mono><span className="text-blue-400">#{s.crime_scene_id}</span></Td>
              <Td><span className="text-gray-100 font-medium">{s.scene_name}</span></Td>
              <Td muted>Case {s.case_id}</Td>
              <Td muted>{s.date_visited ? new Date(s.date_visited).toLocaleDateString() : "—"}</Td>
              <Td muted>Person {s.visited_by}</Td>
              <Td muted><span className="max-w-xs truncate block">{s.description ?? "—"}</span></Td>
              <Td>
                <div className="flex items-center gap-2">
                  <button onClick={() => openEdit(s)}
                    className="text-xs text-gray-500 hover:text-blue-400 bg-gray-800/60 hover:bg-blue-950/40 border border-gray-700/40 hover:border-blue-800/40 px-2.5 py-1.5 rounded-lg">
                    Edit
                  </button>
                  <button onClick={() => setDeleteId(s.crime_scene_id)}
                    className="text-xs text-gray-500 hover:text-red-400 bg-gray-800/60 hover:bg-red-950/40 border border-gray-700/40 hover:border-red-800/40 px-2.5 py-1.5 rounded-lg">
                    Delete
                  </button>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* Create modal */}
      {showCreate && (
        <Modal title="Add Crime Scene" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Case ID" required>
                <input type="number" min={1} value={form.case_id}
                  onChange={e => setForm(f => ({ ...f, case_id: e.target.value }))}
                  placeholder="e.g. 1" className={inputClass()} required />
              </FormField>
              <FormField label="Location ID" required>
                <input type="number" min={1} value={form.location_id}
                  onChange={e => setForm(f => ({ ...f, location_id: e.target.value }))}
                  placeholder="e.g. 3" className={inputClass()} required />
              </FormField>
            </div>
            <FormField label="Scene Name" required>
              <input value={form.scene_name}
                onChange={e => setForm(f => ({ ...f, scene_name: e.target.value }))}
                placeholder="e.g. Warehouse entrance" className={inputClass()} required maxLength={100} />
            </FormField>
            <FormField label="Description">
              <textarea value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3} placeholder="What was found at the scene…"
                className={inputClass() + " resize-none"} />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Date & Time Visited" required>
                <input type="datetime-local" value={form.date_visited}
                  onChange={e => setForm(f => ({ ...f, date_visited: e.target.value }))}
                  className={inputClass()} required />
              </FormField>
              <FormField label="Visited By (Person ID)" required>
                <input type="number" min={1} value={form.visited_by}
                  onChange={e => setForm(f => ({ ...f, visited_by: e.target.value }))}
                  placeholder="e.g. 2" className={inputClass()} required />
              </FormField>
            </div>
            <FormField label="Notes">
              <textarea value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2} className={inputClass() + " resize-none"} />
            </FormField>
            {formError && <p className="text-sm text-red-400 bg-red-950/40 border border-red-800/40 rounded-xl px-3 py-2">{formError}</p>}
            <SubmitRow saving={saving} label="Add Crime Scene" onCancel={() => setShowCreate(false)} />
          </form>
        </Modal>
      )}

      {/* Edit modal */}
      {editScene && (
        <Modal title={`Edit — ${editScene.scene_name}`} onClose={() => setEditScene(null)}>
          <form onSubmit={handleUpdate} className="space-y-4">
            <FormField label="Scene Name" required>
              <input value={form.scene_name}
                onChange={e => setForm(f => ({ ...f, scene_name: e.target.value }))}
                className={inputClass()} required maxLength={100} />
            </FormField>
            <FormField label="Description">
              <textarea value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3} className={inputClass() + " resize-none"} />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Date & Time Visited">
                <input type="datetime-local" value={form.date_visited}
                  onChange={e => setForm(f => ({ ...f, date_visited: e.target.value }))}
                  className={inputClass()} />
              </FormField>
              <FormField label="Visited By (Person ID)">
                <input type="number" min={1} value={form.visited_by}
                  onChange={e => setForm(f => ({ ...f, visited_by: e.target.value }))}
                  className={inputClass()} />
              </FormField>
            </div>
            <FormField label="Notes">
              <textarea value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2} className={inputClass() + " resize-none"} />
            </FormField>
            {formError && <p className="text-sm text-red-400 bg-red-950/40 border border-red-800/40 rounded-xl px-3 py-2">{formError}</p>}
            <SubmitRow saving={saving} label="Save Changes" onCancel={() => setEditScene(null)} />
          </form>
        </Modal>
      )}

      {/* Delete confirm */}
      {deleteId !== null && (
        <Modal title="Delete Crime Scene" onClose={() => setDeleteId(null)}>
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-red-950/30 border border-red-800/40 rounded-xl p-4">
              <svg className="w-5 h-5 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-300 text-sm">
                This cannot be undone. Crime scenes with linked evidence cannot be deleted.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm">
                {deleting ? "Deleting…" : "Delete"}
              </button>
              <button onClick={() => setDeleteId(null)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-2.5 rounded-xl text-sm border border-gray-700">
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
