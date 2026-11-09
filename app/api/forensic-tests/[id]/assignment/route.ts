
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;
    const testId = Number(id);

    if (!Number.isSafeInteger(testId) || testId <= 0) {
      return NextResponse.json(
        { error: "Invalid test ID." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: authData, error: authError } =
      await supabase.auth.getUser();

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

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    const payload = body as Record<string, unknown>;

    if (
      Object.keys(payload).length !== 1 ||
      !Number.isSafeInteger(payload.examiner_id) ||
      Number(payload.examiner_id) <= 0
    ) {
      return NextResponse.json(
        {
          error: "Provide only a valid positive integer examiner_id.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.rpc(
      "assign_forensic_examiner",
      {
        p_test_id: testId,
        p_examiner_id: Number(payload.examiner_id),
      }
    );

    if (error) {
      console.error("Examiner assignment failed:", error.message);

      if (error.code === "42501") {
        return NextResponse.json(
          { error: "Only administrators can assign examiners." },
          { status: 403 }
        );
      }

      if (error.code === "P0002") {
        return NextResponse.json(
          { error: "Forensic test not found." },
          { status: 404 }
        );
      }

      if (error.code === "23514") {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "Unable to assign forensic examiner." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Forensic examiner assigned successfully.",
      test: data,
    });
  } catch (error) {
    console.error("POST forensic test assignment failed:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
