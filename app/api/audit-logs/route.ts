
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const auditLogColumns =
  "audit_id, table_name, record_id, action, old_data, new_data, changed_by, changed_at";

export async function GET(request: NextRequest) {
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

    const params = request.nextUrl.searchParams;

    const tableName = params.get("table_name")?.trim();
    const recordId = params.get("record_id")?.trim();
    const action = params.get("action")?.trim();

    const rawLimit = params.get("limit");
    const limit = rawLimit === null ? 50 : Number(rawLimit);

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: "Limit must be an integer between 1 and 100." },
        { status: 400 }
      );
    }

    if (tableName && tableName.length > 100) {
      return NextResponse.json(
        { error: "Table name must not exceed 100 characters." },
        { status: 400 }
      );
    }

    if (recordId && recordId.length > 100) {
      return NextResponse.json(
        { error: "Record ID must not exceed 100 characters." },
        { status: 400 }
      );
    }

    if (action && action.length > 50) {
      return NextResponse.json(
        { error: "Action must not exceed 50 characters." },
        { status: 400 }
      );
    }

    let query = supabase
      .from("audit_log")
      .select(auditLogColumns)
      .order("changed_at", { ascending: false })
      .order("audit_id", { ascending: false })
      .limit(limit);

    if (tableName) {
      query = query.eq("table_name", tableName);
    }

    if (recordId) {
      query = query.eq("record_id", recordId);
    }

    if (action) {
      query = query.eq("action", action);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Audit log retrieval failed:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });

      return NextResponse.json(
        { error: "Unable to retrieve audit logs." },
        { status: error.code === "42501" ? 403 : 500 }
      );
    }

    return NextResponse.json({
      success: true,
      total: data?.length ?? 0,
      audit_logs: data ?? [],
    });
  } catch (error) {
    console.error("Audit logs API error:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
