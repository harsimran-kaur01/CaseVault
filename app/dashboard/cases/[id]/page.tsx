"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import ErrorMessage from "@/app/components/ErrorMessage";
import Badge from "@/app/components/Badge";

interface Case {
  case_id: number; case_number: string; title: string; description: string | null;
  date_opened: string; date_closed: string | null; status_id: number;
  case_status: { status_name: string } | null;
}
interface Evidence {
  evidence_id: number; evidence_code: string; description: string;
  evidence_type: string; condition_status: string; date_collected: string; sealed: boolean;
}
interface CrimeScene {
  crime_scene_id: number; scene_name: string; description: string | null;
  date_visited: string; visited_by: number; location_id: number; notes: string | null;
}
interface Assignment {
  assignment_id: number; investigator_id: number; role: string | null;
  status: string | null; date_assigned: string | null;
}

function sv(name: string): "success" | "warning" | "info" | "neutral" {
  const l = (name ?? "").toLowerCase();
  if (l.includes("open")) return "info";
  if (l.includes("investigation")) return "warning";
  if (l.includes("closed")) return "success";
  return "neutral";
}
function cv(s: string): "success" | "warning" | "neutral" {
  const l = (s ?? "").toLowerCase();
  if (l === "intact") return "success";
  if (l === "damaged" || l === "degraded" || l === "contaminated") return "warning";
  return "neutral";
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden mb-5">
      <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
        <h2 className="font-semibold text-white text-sm">{title}</h2>
        <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-md">{count}</span>
      </div>
      {children}
    </div>
  );
}

function EmptyMsg({ msg }: { msg: string }) {
  return <p className="px-5 py-6 text-gray-600 text-sm">{msg}</p>;
}

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [scenes, setScenes] = useState<CrimeScene[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const [caseRes, evRes, scenesRes, assignRes] = await Promise.all([
        fetch(`/api/cases/${id}`),
        fetch("/api/evidence"),
        fetch(`/api/crime-scenes?case_id=${id}`),
        fetch("/api/assignments"),
      ]);
      if (!caseRes.ok) { const j = await caseRes.json(); setError(j.error ?? "Not found"); return; }
      const [cj, ej, sj, aj] = await Promise.all([caseRes.json(), evRes.json(), scenesRes.json(), assignRes.json()]);
      setCaseData(cj.case);
      setEvidence((ej.evidence ?? []).filter((e: Evidence & { case_id: number }) => e.case_id === Number(id)));
      setScenes(sj.crime_scenes ?? []);
      setAssignments((aj.assignments ?? []).filter((a: Assignment & { case_id: number }) => a.case_id === Number(id)));
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [id]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={load} />;
  if (!caseData) return null;

  const statusName = caseData.case_status?.status_name ?? `Status ${caseData.status_id}`;

  return (
    <div className="max-w-4xl">
      {/* Back */}
      <Link href="/dashboard/cases"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-200 mb-6 group">
        <svg className="w-4 h-4 group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Cases
      </Link>

      {/* Header */}
      <div className="mb-7">
        <div className="flex items-center gap-3 mb-2">
          <span className="font-mono text-blue-400 text-sm bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md">
            {caseData.case_number}
          </span>
          <Badge text={statusName} variant={sv(statusName)} />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">{caseData.title}</h1>
      </div>

      {/* Meta */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-7">
        {[
          { label: "Opened", value: caseData.date_opened ? new Date(caseData.date_opened).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—" },
          { label: "Closed", value: caseData.date_closed ? new Date(caseData.date_closed).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Ongoing" },
          { label: "Crime Scenes", value: String(scenes.length) },
          { label: "Evidence Items", value: String(evidence.length) },
        ].map(m => (
          <div key={m.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{m.label}</p>
            <p className="text-white font-semibold">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Description */}
      {caseData.description && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2">Description</p>
          <p className="text-gray-200 leading-relaxed text-sm">{caseData.description}</p>
        </div>
      )}

      {/* Crime Scenes */}
      <Section title="Crime Scenes" count={scenes.length}>
        {scenes.length === 0 ? <EmptyMsg msg="No crime scenes recorded for this case" /> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-800">
              {["Scene Name", "Date Visited", "Visited By", "Description", "Notes"].map(h => (
                <th key={h} className="text-left px-5 py-3 text-xs text-gray-500 font-medium uppercase tracking-wider">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-gray-800/50">
              {scenes.map(s => (
                <tr key={s.crime_scene_id} className="hover:bg-gray-800/30">
                  <td className="px-5 py-3 text-gray-100 font-medium">{s.scene_name}</td>
                  <td className="px-5 py-3 text-gray-400 text-xs whitespace-nowrap">{s.date_visited ? new Date(s.date_visited).toLocaleDateString() : "—"}</td>
                  <td className="px-5 py-3 text-gray-400 text-xs">Person {s.visited_by}</td>
                  <td className="px-5 py-3 text-gray-400 text-xs max-w-xs truncate">{s.description ?? "—"}</td>
                  <td className="px-5 py-3 text-gray-500 text-xs max-w-xs truncate">{s.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* Investigators */}
      <Section title="Assigned Investigators" count={assignments.length}>
        {assignments.length === 0 ? <EmptyMsg msg="No investigators assigned" /> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-800">
              {["Person ID", "Role", "Status", "Date Assigned"].map(h => (
                <th key={h} className="text-left px-5 py-3 text-xs text-gray-500 font-medium uppercase tracking-wider">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-gray-800/50">
              {assignments.map(a => (
                <tr key={a.assignment_id} className="hover:bg-gray-800/30">
                  <td className="px-5 py-3 text-gray-200">Person {a.investigator_id}</td>
                  <td className="px-5 py-3">{a.role ? <Badge text={a.role} variant="info" /> : <span className="text-gray-600">—</span>}</td>
                  <td className="px-5 py-3">{a.status ? <Badge text={a.status} variant={a.status === "active" ? "success" : "neutral"} /> : <span className="text-gray-600">—</span>}</td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{a.date_assigned ? new Date(a.date_assigned).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* Evidence */}
      <Section title="Evidence" count={evidence.length}>
        {evidence.length === 0 ? <EmptyMsg msg="No evidence registered for this case" /> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-800">
              {["Code", "Description", "Type", "Condition", "Collected", "Sealed"].map(h => (
                <th key={h} className="text-left px-5 py-3 text-xs text-gray-500 font-medium uppercase tracking-wider">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-gray-800/50">
              {evidence.map(ev => (
                <tr key={ev.evidence_id} className="hover:bg-gray-800/30">
                  <td className="px-5 py-3 font-mono text-blue-400 text-xs">{ev.evidence_code}</td>
                  <td className="px-5 py-3 text-gray-200 max-w-xs truncate text-xs">{ev.description}</td>
                  <td className="px-5 py-3 text-gray-300 capitalize text-xs">{ev.evidence_type}</td>
                  <td className="px-5 py-3"><Badge text={ev.condition_status} variant={cv(ev.condition_status)} /></td>
                  <td className="px-5 py-3 text-gray-400 text-xs whitespace-nowrap">{ev.date_collected ? new Date(ev.date_collected).toLocaleDateString() : "—"}</td>
                  <td className="px-5 py-3">
                    {ev.sealed
                      ? <span className="text-green-400 text-xs font-medium">✓ Sealed</span>
                      : <span className="text-gray-600 text-xs">Unsealed</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  );
}
