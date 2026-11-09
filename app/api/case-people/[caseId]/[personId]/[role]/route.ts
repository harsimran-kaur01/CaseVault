import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateCasePersonSchema } from "@/lib/validation/case-person";

type RouteContext = {
  params: Promise<{
    caseId: string;
    personId: string;
    role: string;
  }>;
};

function parseId(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const id = Number(value);

  return Number.isSafeInteger(id) ? id : null;
}

// GET /api/case-people/[caseId]/[personId]/[role]
export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const params = await context.params;
    const caseId = parseId(params.caseId);
    const personId = parseId(params.personId);

    const allowedRoles = [
      "victim",
      "suspect",
      "witness",
      "complainant",
      "informant",
    ];

    if (!caseId || !personId || !allowedRoles.includes(params.role)) {
      return NextResponse.json(
        { error: "Invalid association identifier." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from("case_person")
      .select("*")
      .eq("case_id", caseId)
      .eq("person_id", personId)
      .eq("role_in_case", params.role)
      .maybeSingle();

    if (error) {
      console.error("Case-person fetch failed:", error.message);

      return NextResponse.json(
        { error: "Unable to fetch association." },
        { status: error.code === "42501" ? 403 : 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Association not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      association: data,
    });
  } catch (error) {
    console.error("Case-person GET error:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

// PATCH /api/case-people/[caseId]/[personId]/[role]
export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const params = await context.params;
    const caseId = parseId(params.caseId);
    const personId = parseId(params.personId);

    const allowedRoles = [
      "victim",
      "suspect",
      "witness",
      "complainant",
      "informant",
    ];

    if (!caseId || !personId || !allowedRoles.includes(params.role)) {
      return NextResponse.json(
        { error: "Invalid association identifier." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    let body;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 }
      );
    }

    const validation = updateCasePersonSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed.",
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("case_person")
      .update(validation.data)
      .eq("case_id", caseId)
      .eq("person_id", personId)
      .eq("role_in_case", params.role)
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("Case-person update failed:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });

      let status = 500;

      if (error.code === "42501") status = 403;
      else if (error.code === "23505") status = 409;
      else if (
        ["23503", "23514", "23502", "22007"].includes(error.code)
      ) status = 400;

      return NextResponse.json(
        { error: "Unable to update association." },
        { status }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Association not found or access denied." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Association updated successfully.",
      association: data,
    });
  } catch (error) {
    console.error("Case-person PATCH error:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}


// ---------------------------------------------------------------------------
// DELETE /api/case-people/[caseId]/[personId]/[role]
// Admin only. RLS enforces administrator-only deletion.
// ---------------------------------------------------------------------------
export async function DELETE(
  _request: Request,
  context: RouteContext
) {
  try {
    const params = await context.params;
    const caseId = parseId(params.caseId);
    const personId = parseId(params.personId);

    const allowedRoles = [
      "victim",
      "suspect",
      "witness",
      "complainant",
      "informant",
    ];

    if (!caseId || !personId || !allowedRoles.includes(params.role)) {
      return NextResponse.json(
        { error: "Invalid association identifier." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from("case_person")
      .delete()
      .eq("case_id", caseId)
      .eq("person_id", personId)
      .eq("role_in_case", params.role)
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("Case-person deletion failed:", {
        message: error.message,
        code: error.code,
        details: error.details,
      });

      if (error.code === "42501") {
        return NextResponse.json(
          { error: "You do not have permission to delete this association." },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { error: "Unable to delete association." },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Association not found or deletion not permitted." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Case-person association deleted successfully.",
      association: data,
    });
  } catch (error) {
    console.error("Case-person DELETE error:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

