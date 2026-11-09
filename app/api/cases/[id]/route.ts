
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateCaseSchema } from "@/lib/validation/case";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Get the case ID
    const { id } = await params;
    const caseId = Number(id);

    if (!Number.isSafeInteger(caseId) || caseId <= 0) {
      return NextResponse.json(
        { error: "Invalid case ID." },
        { status: 400 }
      );
    }

    // 2. Initialize Supabase
    const supabase = await createClient();

    // 3. Verify authentication
    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    // 4. Retrieve the requested case
    // RLS determines whether the user can access it.
    const { data: caseData, error: caseError } = await supabase
      .from("cases")
      .select(`
        case_id,
        case_number,
        title,
        description,
        date_opened,
        date_closed,
        status_id,
        location_id
      `)
      .eq("case_id", caseId)
      .maybeSingle();

    if (caseError) {
      console.error("Case retrieval failed:", caseError.message);

      return NextResponse.json(
        { error: "Unable to retrieve case." },
        { status: 500 }
      );
    }

    // 5. Handle missing or inaccessible cases
    if (!caseData) {
      return NextResponse.json(
        { error: "Case not found." },
        { status: 404 }
      );
    }

    // 6. Return case details
    return NextResponse.json({
      success: true,
      case: caseData,
    });

  } catch (error) {
    console.error("GET /api/cases/[id] failed:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}


export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Get and validate case ID
    const { id } = await params;
    const caseId = Number(id);

    if (!Number.isSafeInteger(caseId) || caseId <= 0) {
      return NextResponse.json(
        { error: "Invalid case ID." },
        { status: 400 }
      );
    }

    // 2. Initialize Supabase
    const supabase = await createClient();

    // 3. Verify authenticated user
    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    // 4. Parse request body
    let body;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    // 5. Validate update fields
    const validation = updateCaseSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed.",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // 6. Update case
    // RLS determines whether this user can update the case.
    const { data: updatedCase, error: updateError } =
      await supabase
        .from("cases")
        .update(validation.data)
        .eq("case_id", caseId)
        .select(`
          case_id,
          case_number,
          title,
          description,
          date_opened,
          date_closed,
          status_id,
          location_id
        `)
        .maybeSingle();

    // 7. Handle database errors
    if (updateError) {
      console.error("Case update failed:", updateError.message);

      if (updateError.code === "42501") {
        return NextResponse.json(
          { error: "You do not have permission to update this case." },
          { status: 403 }
        );
      }

      if (
        updateError.code === "23503" ||
        updateError.code === "23514"
      ) {
        return NextResponse.json(
          { error: "Invalid case data or database constraint violation." },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Unable to update case." },
        { status: 500 }
      );
    }

    // 8. Handle inaccessible or nonexistent case
    if (!updatedCase) {
      return NextResponse.json(
        { error: "Case not found or you do not have permission to update it." },
        { status: 404 }
      );
    }

    // 9. Return updated case
    return NextResponse.json({
      success: true,
      message: "Case updated successfully.",
      case: updatedCase,
    });

  } catch (error) {
    console.error("PATCH /api/cases/[id] failed:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
