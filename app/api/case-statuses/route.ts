import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("case_status")
      .select("status_id, status_name")
      .order("status_id", { ascending: true });

    if (error) {
      return NextResponse.json({ error: "Unable to retrieve statuses." }, { status: 500 });
    }

    return NextResponse.json({ success: true, statuses: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
