export default function LoadingSpinner({ message = "Loading…" }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="relative">
        <div className="w-10 h-10 rounded-full border-2 border-gray-800" />
        <div className="absolute inset-0 w-10 h-10 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      </div>
      <p className="text-gray-500 text-sm">{message}</p>
    </div>
  );
}
