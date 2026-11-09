import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: Request,
  { params }: RouteContext
) {
  try {
    // 1. Validate evidence ID
    const { id } = await params;
    const evidenceId = Number(id);

    if (!Number.isSafeInteger(evidenceId) || evidenceId <= 0) {
      return NextResponse.json(
        { error: "Invalid evidence ID." },
        { status: 400 }
      );
    }

    // 2. Authenticate user
    const supabase = await createClient();

    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    // 3. Verify evidence is accessible through RLS
    const { data: evidence, error: evidenceError } = await supabase
      .from("evidence")
      .select("evidence_id")
      .eq("evidence_id", evidenceId)
      .maybeSingle();

    if (evidenceError) {
      console.error("Evidence lookup failed:", evidenceError.message);
      return NextResponse.json(
        { error: "Unable to verify evidence record." },
        { status: 500 }
      );
    }

    if (!evidence) {
      return NextResponse.json(
        { error: "Evidence not found or access denied." },
        { status: 404 }
      );
    }

    // 4. Retrieve custody history via PostgreSQL function
    const { data: history, error: historyError } = await supabase.rpc(
      "get_chain_of_custody",
      { p_evidence_id: evidenceId }
    );

    if (historyError) {
      console.error("Chain of custody retrieval failed:", historyError.message);

      if (historyError.code === "42501") {
        return NextResponse.json(
          { error: "You do not have permission to view this custody history." },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { error: "Unable to retrieve custody history." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      evidence_id: evidenceId,
      total: history?.length ?? 0,
      history: history ?? [],
    });

  } catch (error) {
    console.error("GET /api/evidence/[id]/transfers failed:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
