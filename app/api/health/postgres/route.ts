
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("health_check");

    if (error || data !== true) {
      console.error("PostgreSQL health check failed:", error?.message);

      return NextResponse.json(
        {
          status: "error",
          message: "PostgreSQL connection failed.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: "connected",
      database: "PostgreSQL",
    });
  } catch (error) {
    console.error("PostgreSQL health check failed:", error);

    return NextResponse.json(
      {
        status: "error",
        message: "PostgreSQL connection failed.",
      },
      { status: 500 }
    );
  }
}
