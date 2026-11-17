
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Ask Supabase Auth to validate the current session.
    const { data, error } = await supabase.auth.getUser();

    if (error && error.name !== "AuthSessionMissingError") {
      console.error("Supabase check failed:", error.message);

      return NextResponse.json(
        { status: "error", message: "Supabase check failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: "connected",
      authenticated: !error && !!data.user,
    });
  } catch (error) {
    console.error("Supabase check failed:", error);

    return NextResponse.json(
      { status: "error", message: "Supabase check failed" },
      { status: 500 }
    );
  }
}
