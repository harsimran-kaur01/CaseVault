import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Authenticate user
    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    // Read search query
    const query = request.nextUrl.searchParams.get("q")?.trim();

    if (!query) {
      return NextResponse.json(
        { error: "Search query is required." },
        { status: 400 }
      );
    }

    if (query.length > 200) {
      return NextResponse.json(
        { error: "Search query must not exceed 200 characters." },
        { status: 400 }
      );
    }

    // Call existing PostgreSQL function
    const { data, error } = await supabase.rpc("search_cases", {
      p_query: query,
    });

    if (error) {
      console.error("Case search failed:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });

      return NextResponse.json(
        { error: "Unable to search cases." },
        { status: error.code === "42501" ? 403 : 500 }
      );
    }

    return NextResponse.json({
      success: true,
      query,
      total: data.length,
      results: data,
    });
  } catch (error) {
    console.error("Case search GET error:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}