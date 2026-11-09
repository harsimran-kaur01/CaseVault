import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createForensicTestSchema } from "@/lib/validation/forensic-test";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const { data: tests, error } = await supabase
      .from("forensic_test")
      .select(
        "test_id, evidence_id, test_type, requested_by, request_date, priority, status, notes"
      )
      .order("request_date", { ascending: false });

    if (error) {
      console.error("Forensic test retrieval failed:", error.message);
      return NextResponse.json(
        { error: "Unable to retrieve forensic tests." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, total: tests.length, tests });
  } catch (error) {
    console.error("GET /api/forensic-tests failed:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    const validation = createForensicTestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed.",
          details: validation.error.issues.map((i) => ({
            path: i.path,
            message: i.message,
          })),
        },
        { status: 400 }
      );
    }

    // Exclude server-generated fields: test_id and request_date are set by PostgreSQL.
    const { data: test, error: insertError } = await supabase
      .from("forensic_test")
      .insert(validation.data)
      .select(
        "test_id, evidence_id, test_type, requested_by, request_date, priority, status, notes"
      )
      .single();

    if (insertError) {
      console.error("Forensic test creation failed:", insertError.message);

      if (insertError.code === "42501") {
        return NextResponse.json(
          { error: "You do not have permission to create a forensic test." },
          { status: 403 }
        );
      }
      if (insertError.code === "23503") {
        return NextResponse.json(
          { error: "Invalid evidence_id or requested_by reference." },
          { status: 400 }
        );
      }
      if (insertError.code === "23514") {
        return NextResponse.json(
          { error: "Invalid priority or status value." },
          { status: 400 }
        );
      }
      if (insertError.code === "23502") {
        return NextResponse.json(
          { error: "A required field is missing." },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Unable to create forensic test." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Forensic test created successfully.", test },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/forensic-tests failed:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
