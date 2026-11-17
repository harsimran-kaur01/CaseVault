"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import StatCard from "@/app/components/StatCard";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import ErrorMessage from "@/app/components/ErrorMessage";
import Badge from "@/app/components/Badge";

interface DashboardData {
  overview: { total_cases: number; pending_forensic_tests: number; total_evidence_items: number; investigators: number; };
  case_summary: Array<{ case_id: number; case_number: string; title: string; status: string; date_opened: string; evidence_count: number; }>;
  pending_forensics: Array<{ test_id: number; evidence_code: string; test_type: string; days_waiting: number; }>;
  investigator_workload: Array<{ investigator_name: string; active_cases: number; }>;
}

function statusVariant(s: string): "success" | "warning" | "info" | "neutral" {
  const l = (s ?? "").toLowerCase();
  if (l.includes("open")) return "info";
  if (l.includes("investigation")) return "warning";
  if (l.includes("closed")) return "success";
  return "neutral";
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then(r => r.json())
      .then(json => { if (json.error) setError(json.error); else setData(json); })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner message="Loading dashboard…" />;
  if (error) return <ErrorMessage message={error} onRetry={() => location.reload()} />;
  if (!data) return null;

  const { overview, case_summary, pending_forensics, investigator_workload } = data;

  return (
    <div className="max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">System-wide overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Cases" value={overview.total_cases} color="blue"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
        />
        <StatCard label="Pending Forensics" value={overview.pending_forensic_tests} color="yellow"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>}
        />
        <StatCard label="Evidence Items" value={overview.total_evidence_items} color="purple"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
        />
        <StatCard label="Investigators" value={overview.investigators} color="green"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Cases table */}
        <div className="xl:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="font-semibold text-white text-sm">Recent Cases</h2>
            <Link href="/dashboard/cases" className="text-xs text-blue-400 hover:text-blue-300">View all →</Link>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium uppercase tracking-wider">Case #</th>
                <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium uppercase tracking-wider">Title</th>
                <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium uppercase tracking-wider">Opened</th>
                <th className="text-right px-5 py-3 text-xs text-gray-500 font-medium uppercase tracking-wider">Evid.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {case_summary.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-600 text-sm">No cases</td></tr>
              )}
              {case_summary.slice(0, 8).map(c => (
                <tr key={c.case_id} className="hover:bg-gray-800/40">
                  <td className="px-5 py-3">
                    <Link href={`/dashboard/cases/${c.case_id}`} className="font-mono text-blue-400 text-xs hover:text-blue-300">{c.case_number}</Link>
                  </td>
                  <td className="px-5 py-3 text-gray-200 max-w-[180px] truncate">{c.title}</td>
                  <td className="px-5 py-3"><Badge text={c.status ?? "Unknown"} variant={statusVariant(c.status)} /></td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{c.date_opened ? new Date(c.date_opened).toLocaleDateString() : "—"}</td>
                  <td className="px-5 py-3 text-right text-gray-400 text-xs">{c.evidence_count ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right col */}
        <div className="space-y-5">
          {/* Workload */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="font-semibold text-white text-sm">Investigator Workload</h2>
            </div>
            <ul className="divide-y divide-gray-800/60">
              {investigator_workload.length === 0 && (
                <li className="px-5 py-6 text-center text-gray-600 text-sm">No data</li>
              )}
              {investigator_workload.slice(0, 6).map((inv, i) => (
                <li key={i} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shrink-0">
                      <span className="text-white text-xs font-bold">
                        {(inv.investigator_name ?? "?")[0].toUpperCase()}
                      </span>
                    </div>
                    <span className="text-gray-200 text-sm truncate">{inv.investigator_name}</span>
                  </div>
                  <span className="text-blue-400 text-xs font-semibold shrink-0 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md">
                    {inv.active_cases} cases
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Pending forensics */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="font-semibold text-white text-sm">Pending Forensics</h2>
            </div>
            <ul className="divide-y divide-gray-800/60">
              {pending_forensics.length === 0 && (
                <li className="px-5 py-6 text-center text-gray-600 text-sm">No pending tests</li>
              )}
              {pending_forensics.slice(0, 5).map(pf => (
                <li key={pf.test_id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-blue-400">{pf.evidence_code}</p>
                    <p className="text-gray-500 text-xs mt-0.5 truncate">{pf.test_type}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md border shrink-0
                    ${pf.days_waiting > 14
                      ? "text-red-400 bg-red-500/10 border-red-500/20"
                      : "text-yellow-400 bg-yellow-500/10 border-yellow-500/20"
                    }`}>
                    {pf.days_waiting}d
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
