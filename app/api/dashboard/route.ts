
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Verify authenticated user
    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    // Fetch all four dashboard sections in parallel
    const [
      caseSummaryResult,
      pendingForensicsResult,
      evidenceCustodyResult,
      investigatorWorkloadResult,
    ] = await Promise.all([
      supabase
        .from("v_case_summary")
        .select("*")
        .order("date_opened", { ascending: false }),

      supabase
        .from("v_pending_forensics")
        .select("*")
        .order("days_waiting", { ascending: false }),

      supabase
        .from("v_evidence_current_custody")
        .select("*")
        .order("evidence_id", { ascending: false }),

      supabase
        .from("v_investigator_workload")
        .select("*")
        .order("active_cases", { ascending: false }),
    ]);

    const results = [
      { name: "case summary", error: caseSummaryResult.error },
      { name: "pending forensics", error: pendingForensicsResult.error },
      { name: "evidence custody", error: evidenceCustodyResult.error },
      { name: "investigator workload", error: investigatorWorkloadResult.error },
    ];

    const failedResult = results.find((result) => result.error);

    if (failedResult) {
      const error = failedResult.error!;

      console.error("Dashboard retrieval failed:", {
        section: failedResult.name,
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });

      return NextResponse.json(
        { error: `Unable to retrieve ${failedResult.name}.` },
        { status: error.code === "42501" ? 403 : 500 }
      );
    }

    const cases = caseSummaryResult.data ?? [];
    const pendingForensics = pendingForensicsResult.data ?? [];
    const evidenceCustody = evidenceCustodyResult.data ?? [];
    const investigatorWorkload = investigatorWorkloadResult.data ?? [];

    return NextResponse.json({
      success: true,

      overview: {
        total_cases: cases.length,
        pending_forensic_tests: pendingForensics.length,
        total_evidence_items: evidenceCustody.length,
        investigators: investigatorWorkload.length,
      },

      case_summary: cases,
      pending_forensics: pendingForensics,
      evidence_custody: evidenceCustody,
      investigator_workload: investigatorWorkload,
    });
  } catch (error) {
    console.error("Dashboard API error:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
