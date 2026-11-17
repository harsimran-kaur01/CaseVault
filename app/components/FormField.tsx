export default function FormField({ label, required, error, hint, children }: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-gray-600">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

export function inputClass(error?: string) {
  return `w-full bg-gray-800/80 border ${error ? "border-red-500" : "border-gray-700"} rounded-lg px-3 py-2.5 text-white text-sm
          placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500 hover:border-gray-600`;
}

export function selectClass() {
  return `w-full bg-gray-800/80 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm
          focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500 hover:border-gray-600`;
}

export function SubmitRow({ saving, label, onCancel }: {
  saving: boolean;
  label: string;
  onCancel: () => void;
}) {
  return (
    <div className="flex gap-3 pt-3 border-t border-gray-800 mt-2">
      <button type="submit" disabled={saving}
        className="flex-1 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                   text-white font-semibold py-2.5 rounded-xl text-sm shadow-lg shadow-blue-600/20">
        {saving
          ? <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Saving…
            </span>
          : label
        }
      </button>
      <button type="button" onClick={onCancel}
        className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-2.5 rounded-xl text-sm border border-gray-700">
        Cancel
      </button>
    </div>
  );
}
