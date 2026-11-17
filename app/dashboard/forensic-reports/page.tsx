"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/app/components/PageHeader";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import ErrorMessage from "@/app/components/ErrorMessage";
import Badge from "@/app/components/Badge";

interface ForensicReport {
  report_id: number;
  test_id: number;
  examiner_id: number;
  report_date: string;
  conclusion: string;
  summary: string | null;
  notes: string | null;
  mongo_report_id: string | null;
  mongo_document: {
    report_type: string;
    confidence: number;
    findings: unknown[];
  } | null;
}

export default function ForensicReportsPage() {
  const [reports, setReports] = useState<ForensicReport[]>([]);
  const [total, setTotal] = useState(0);
  const [mongoAvailable, setMongoAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/forensic-reports");
      const json = await res.json();
      if (!res.ok) setError(json.error ?? "Failed to load forensic reports");
      else {
        setReports(json.reports ?? []);
        setTotal(json.total ?? 0);
        setMongoAvailable(json.mongo_available !== false);
      }
    } catch {
      setError("Network error loading forensic reports");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = reports.filter(r => {
    const q = search.toLowerCase();
    return (
      (r.conclusion ?? "").toLowerCase().includes(q) ||
      (r.summary ?? "").toLowerCase().includes(q) ||
      (r.mongo_document?.report_type ?? "").toLowerCase().includes(q)
    );
  });

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader title="Forensic Reports" description={`${total} report${total !== 1 ? "s" : ""}`} />

      <div className="mb-5">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by type, conclusion, or summary…"
          className="w-full max-w-sm bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white
                     text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-5 py-3 text-gray-400 font-medium">ID</th>
                <th className="text-left px-5 py-3 text-gray-400 font-medium">Type</th>
                <th className="text-left px-5 py-3 text-gray-400 font-medium">Conclusion</th>
                <th className="text-left px-5 py-3 text-gray-400 font-medium">Summary</th>
                <th className="text-left px-5 py-3 text-gray-400 font-medium">Confidence</th>
                <th className="text-left px-5 py-3 text-gray-400 font-medium">Date</th>
                <th className="text-left px-5 py-3 text-gray-400 font-medium">MongoDB</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-600">
                  {search ? "No reports match your search" : "No forensic reports found"}
                </td></tr>
              )}
              {filtered.map((r) => (
                <tr key={r.report_id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="px-5 py-3 font-mono text-blue-400 text-xs">#{r.report_id}</td>
                  <td className="px-5 py-3">
                    {r.mongo_document?.report_type
                      ? <Badge text={r.mongo_document.report_type} variant="info" />
                      : <span className="text-gray-600 text-xs">—</span>
                    }
                  </td>
                  <td className="px-5 py-3 text-gray-200 max-w-xs truncate">{r.conclusion}</td>
                  <td className="px-5 py-3 text-gray-400 max-w-xs truncate">
                    {r.summary ?? <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-5 py-3 text-gray-300">
                    {r.mongo_document?.confidence != null
                      ? `${Math.round(r.mongo_document.confidence * 100)}%`
                      : <span className="text-gray-600">—</span>
                    }
                  </td>
                  <td className="px-5 py-3 text-gray-400 whitespace-nowrap">
                    {r.report_date ? new Date(r.report_date).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-5 py-3">
                    {r.mongo_report_id
                      ? <span className="text-green-400 text-xs font-mono">✓ Linked</span>
                      : <span className="text-gray-600 text-xs">Not linked</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
