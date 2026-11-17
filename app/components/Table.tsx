export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">{children}</table>
      </div>
    </div>
  );
}

export function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={`px-5 py-3 text-xs text-gray-500 font-medium uppercase tracking-wider ${right ? "text-right" : "text-left"}`}>
      {children}
    </th>
  );
}

export function Td({ children, mono, right, muted, className = "" }: {
  children: React.ReactNode;
  mono?: boolean;
  right?: boolean;
  muted?: boolean;
  className?: string;
}) {
  return (
    <td className={`px-5 py-3.5 ${mono ? "font-mono text-xs" : "text-sm"} ${right ? "text-right" : ""} ${muted ? "text-gray-500" : "text-gray-200"} ${className}`}>
      {children}
    </td>
  );
}

export function EmptyRow({ cols, message }: { cols: number; message: string }) {
  return (
    <tr>
      <td colSpan={cols} className="px-5 py-16 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gray-800/60 border border-gray-700/40 flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <p className="text-gray-600 text-sm">{message}</p>
        </div>
      </td>
    </tr>
  );
}

export function SearchBar({ value, onChange, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative mb-5 w-full max-w-sm">
      <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"
        fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm
                   placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50
                   hover:border-gray-700" />
    </div>
  );
}

export function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700
                 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-blue-600/20
                 hover:shadow-blue-500/30">
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
      </svg>
      {label}
    </button>
  );
}
