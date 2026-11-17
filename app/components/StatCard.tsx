export default function StatCard({
  label,
  value,
  icon,
  color = "blue",
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: "blue" | "green" | "yellow" | "purple" | "red";
  sub?: string;
}) {
  const palettes = {
    blue:   { ring: "bg-blue-500/10 border-blue-500/20 text-blue-400",   glow: "shadow-blue-500/10" },
    green:  { ring: "bg-green-500/10 border-green-500/20 text-green-400", glow: "shadow-green-500/10" },
    yellow: { ring: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400", glow: "shadow-yellow-500/10" },
    purple: { ring: "bg-purple-500/10 border-purple-500/20 text-purple-400", glow: "shadow-purple-500/10" },
    red:    { ring: "bg-red-500/10 border-red-500/20 text-red-400",       glow: "shadow-red-500/10" },
  };
  const p = palettes[color];

  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-lg ${p.glow} hover:border-gray-700 group`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${p.ring}`}>
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold text-white mb-0.5 tracking-tight">{value}</p>
      <p className="text-sm text-gray-400">{label}</p>
      {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
    </div>
  );
}
