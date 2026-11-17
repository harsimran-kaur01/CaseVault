export default function Badge({ text, variant = "neutral" }: {
  text: string;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "neutral";
}) {
  const styles: Record<string, string> = {
    default: "bg-gray-700/60 text-gray-200 border-gray-600/40",
    success: "bg-green-500/10 text-green-400 border-green-500/20",
    warning: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    danger:  "bg-red-500/10 text-red-400 border-red-500/20",
    info:    "bg-blue-500/10 text-blue-400 border-blue-500/20",
    neutral: "bg-gray-700/40 text-gray-400 border-gray-700/40",
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${styles[variant]}`}>
      {text}
    </span>
  );
}
