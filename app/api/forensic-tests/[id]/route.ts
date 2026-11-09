import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateForensicTestSchema } from "@/lib/validation/forensic-test";

type RouteContext = { params: Promise<{ id: string }> };

const SELECT_FIELDS =
  "test_id, evidence_id, test_type, requested_by, request_date, priority, status, notes";

export async function GET(
  _request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;
    const testId = Number(id);

    if (!Number.isSafeInteger(testId) || testId <= 0) {
      return NextResponse.json({ error: "Invalid test ID." }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const { data: test, error } = await supabase
      .from("forensic_test")
      .select(SELECT_FIELDS)
      .eq("test_id", testId)
      .maybeSingle();

    if (error) {
      console.error("Forensic test retrieval failed:", error.message);
      return NextResponse.json(
        { error: "Unable to retrieve forensic test." },
        { status: 500 }
      );
    }

    if (!test) {
      return NextResponse.json(
        { error: "Forensic test not found or access denied." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, test });
  } catch (error) {
    console.error("GET /api/forensic-tests/[id] failed:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;
    const testId = Number(id);

    if (!Number.isSafeInteger(testId) || testId <= 0) {
      return NextResponse.json({ error: "Invalid test ID." }, { status: 400 });
    }

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

    const validation = updateForensicTestSchema.safeParse(body);
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

    const { data: test, error: updateError } = await supabase
      .from("forensic_test")
      .update(validation.data)
      .eq("test_id", testId)
      .select(SELECT_FIELDS)
      .maybeSingle();

    if (updateError) {
      console.error("Forensic test update failed:", updateError.message);
      if (updateError.code === "P0001") {
        return NextResponse.json(
          {
            error: updateError.message,
          },
          { status: 409 }
        );
     }

      if (updateError.code === "42501") {
        return NextResponse.json(
          { error: "You do not have permission to update this forensic test." },
          { status: 403 }
        );
      }
      if (updateError.code === "23514") {
        return NextResponse.json(
          { error: "Invalid priority or status value." },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Unable to update forensic test." },
        { status: 500 }
      );
    }

    if (!test) {
      return NextResponse.json(
        { error: "Forensic test not found or access denied." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, test });
  } catch (error) {
    console.error("PATCH /api/forensic-tests/[id] failed:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
