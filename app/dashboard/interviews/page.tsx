"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/app/components/PageHeader";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import ErrorMessage from "@/app/components/ErrorMessage";
import Modal from "@/app/components/Modal";
import FormField, { inputClass } from "@/app/components/FormField";

interface Interview {
  interview_id: number;
  case_id: number;
  person_id: number;
  conducted_by: number;
  interview_date: string;
  location_id: number | null;
  notes: string | null;
  recording_path: string | null;
  mongo_transcript_id: string | null;
}

const EMPTY = {
  case_id: "", person_id: "", conducted_by: "", interview_date: "",
  location_id: "", notes: "", recording_path: "",
  // transcript fields
  language: "English", summary: "", keywords: "", sentiment: "neutral",
  speaker: "Investigator", text: "",
};

export default function InterviewsPage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
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
      const res = await fetch("/api/interviews");
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed to load interviews"); return; }
      setInterviews(json.interviews ?? []); setTotal(json.total ?? 0);
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setFormError("");
    try {
      const body = {
        case_id: Number(form.case_id),
        person_id: Number(form.person_id),
        conducted_by: Number(form.conducted_by),
        interview_date: new Date(form.interview_date).toISOString(),
        location_id: form.location_id ? Number(form.location_id) : null,
        notes: form.notes || null,
        recording_path: form.recording_path || null,
        transcript: {
          language: form.language,
          summary: form.summary,
          keywords: form.keywords.split(",").map(k => k.trim()).filter(Boolean),
          sentiment: form.sentiment,
          attachments: [],
          transcript: form.text
            ? [{ speaker: form.speaker as "Investigator" | "Interviewee", offset_sec: 0, text: form.text }]
            : [],
        },
      };

      const res = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) { setFormError(json.error ?? "Failed to create interview"); return; }
      setShowCreate(false); setForm(EMPTY); load();
    } catch { setFormError("Network error"); }
    finally { setSaving(false); }
  }

  const filtered = interviews.filter(i => {
    const q = search.toLowerCase();
    return (i.notes ?? "").toLowerCase().includes(q) ||
      String(i.case_id).includes(q) || String(i.person_id).includes(q);
  });

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader title="Interviews" description={`${total} interview${total !== 1 ? "s" : ""} on record`}
        action={
          <button onClick={() => { setForm(EMPTY); setFormError(""); setShowCreate(true); }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Interview
          </button>
        }
      />

      <div className="mb-5">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by case ID, person ID, or notes…"
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
                <th className="text-left px-5 py-3 text-gray-400 font-medium">Person ID</th>
                <th className="text-left px-5 py-3 text-gray-400 font-medium">Conducted By</th>
                <th className="text-left px-5 py-3 text-gray-400 font-medium">Date</th>
                <th className="text-left px-5 py-3 text-gray-400 font-medium">Notes</th>
                <th className="text-left px-5 py-3 text-gray-400 font-medium">Transcript</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-600">
                  {search ? "No interviews match your search" : "No interviews found"}
                </td></tr>
              )}
              {filtered.map(i => (
                <tr key={i.interview_id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="px-5 py-3 font-mono text-blue-400 text-xs">#{i.interview_id}</td>
                  <td className="px-5 py-3 text-gray-300">Case {i.case_id}</td>
                  <td className="px-5 py-3 text-gray-300">Person {i.person_id}</td>
                  <td className="px-5 py-3 text-gray-300">Person {i.conducted_by}</td>
                  <td className="px-5 py-3 text-gray-400 whitespace-nowrap">
                    {i.interview_date ? new Date(i.interview_date).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-5 py-3 text-gray-400 max-w-xs truncate">
                    {i.notes ?? <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-5 py-3">
                    {i.mongo_transcript_id
                      ? <span className="text-green-400 text-xs">✓ Linked</span>
                      : <span className="text-gray-600 text-xs">None</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <Modal title="New Interview" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Case ID" required>
                <input type="number" min={1} value={form.case_id}
                  onChange={e => setForm(f => ({ ...f, case_id: e.target.value }))}
                  placeholder="e.g. 1" className={inputClass()} required />
              </FormField>
              <FormField label="Person ID (interviewee)" required>
                <input type="number" min={1} value={form.person_id}
                  onChange={e => setForm(f => ({ ...f, person_id: e.target.value }))}
                  placeholder="e.g. 3" className={inputClass()} required />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Conducted By (person ID)" required>
                <input type="number" min={1} value={form.conducted_by}
                  onChange={e => setForm(f => ({ ...f, conducted_by: e.target.value }))}
                  placeholder="e.g. 2" className={inputClass()} required />
              </FormField>
              <FormField label="Date & Time" required>
                <input type="datetime-local" value={form.interview_date}
                  onChange={e => setForm(f => ({ ...f, interview_date: e.target.value }))}
                  className={inputClass()} required />
              </FormField>
            </div>
            <FormField label="Notes">
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Interview notes…" rows={2} className={inputClass() + " resize-none"} />
            </FormField>

            <div className="border-t border-gray-800 pt-4">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-3">Transcript</p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Language">
                    <input value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
                      className={inputClass()} />
                  </FormField>
                  <FormField label="Sentiment">
                    <input value={form.sentiment} onChange={e => setForm(f => ({ ...f, sentiment: e.target.value }))}
                      placeholder="neutral / positive / negative" className={inputClass()} />
                  </FormField>
                </div>
                <FormField label="Summary" required>
                  <textarea value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))}
                    placeholder="Brief summary of the interview…" rows={2}
                    className={inputClass() + " resize-none"} required />
                </FormField>
                <FormField label="Keywords (comma-separated)">
                  <input value={form.keywords} onChange={e => setForm(f => ({ ...f, keywords: e.target.value }))}
                    placeholder="weapon, alibi, witness" className={inputClass()} />
                </FormField>
                <FormField label="Opening Statement" required>
                  <textarea value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
                    placeholder="First transcript line…" rows={2}
                    className={inputClass() + " resize-none"} required />
                </FormField>
              </div>
            </div>

            {formError && <p className="text-sm text-red-400 bg-red-950/50 border border-red-800 rounded-lg px-3 py-2">{formError}</p>}
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
                {saving ? "Creating…" : "Create Interview"}
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
