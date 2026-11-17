"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(data => {
        if (!data.authenticated) router.replace("/login");
        else { setUser(data.user); setChecking(false); }
      })
      .catch(() => router.replace("/login"));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border-2 border-gray-800" />
          <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-950">
      <Sidebar user={user} />
      <main className="flex-1 overflow-y-auto p-8 min-w-0">{children}</main>
    </div>
  );
}
