"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/app/components/PageHeader";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import ErrorMessage from "@/app/components/ErrorMessage";
import Badge from "@/app/components/Badge";

interface AuditLog {
  audit_id: number;
  table_name: string;
  record_id: string | null;
  action: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  changed_by: string;
  changed_at: string;
}

function actionVariant(a: string): "success" | "warning" | "danger" | "info" | "neutral" {
  const l = (a ?? "").toUpperCase();
  if (l === "INSERT") return "success";
  if (l === "UPDATE") return "warning";
  if (l === "DELETE") return "danger";
  if (l === "SELECT") return "info";
  return "neutral";
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/audit-logs");
      const json = await res.json();
      if (!res.ok) setError(json.error ?? "Failed to load audit logs");
      else { setLogs(json.audit_logs ?? []); setTotal(json.total ?? 0); }
    } catch {
      setError("Network error loading audit logs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = logs.filter(l => {
    const q = search.toLowerCase();
    return (
      (l.action ?? "").toLowerCase().includes(q) ||
      (l.table_name ?? "").toLowerCase().includes(q) ||
      (l.changed_by ?? "").toLowerCase().includes(q) ||
      (l.record_id ?? "").toLowerCase().includes(q)
    );
  });

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader title="Audit Logs" description={`${total} log entr${total !== 1 ? "ies" : "y"}`} />

      <div className="mb-5">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by action, table, record, or user…"
          className="w-full max-w-sm bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white
                     text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-5 py-3 text-gray-400 font-medium">Timestamp</th>
                <th className="text-left px-5 py-3 text-gray-400 font-medium">Action</th>
                <th className="text-left px-5 py-3 text-gray-400 font-medium">Table</th>
                <th className="text-left px-5 py-3 text-gray-400 font-medium">Record ID</th>
                <th className="text-left px-5 py-3 text-gray-400 font-medium">Changed By</th>
                <th className="text-left px-5 py-3 text-gray-400 font-medium">Changes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-gray-600">
                  {search ? "No logs match your search" : "No audit logs found"}
                </td></tr>
              )}
              {filtered.map((l) => (
                <tr key={l.audit_id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="px-5 py-3 text-gray-400 whitespace-nowrap text-xs font-mono">
                    {l.changed_at ? new Date(l.changed_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <Badge text={l.action ?? "UNKNOWN"} variant={actionVariant(l.action)} />
                  </td>
                  <td className="px-5 py-3 text-gray-300 font-mono text-xs">{l.table_name}</td>
                  <td className="px-5 py-3 text-gray-400 text-xs font-mono">{l.record_id ?? "—"}</td>
                  <td className="px-5 py-3 text-gray-500 font-mono text-xs truncate max-w-[140px]">{l.changed_by ?? "—"}</td>
                  <td className="px-5 py-3 text-xs text-gray-500">
                    {l.old_data || l.new_data
                      ? <span className="text-gray-400">
                          {l.old_data ? `${Object.keys(l.old_data).length} old` : ""}
                          {l.old_data && l.new_data ? " / " : ""}
                          {l.new_data ? `${Object.keys(l.new_data).length} new fields` : ""}
                        </span>
                      : <span className="text-gray-700">—</span>
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
