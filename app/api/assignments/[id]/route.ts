import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateAssignmentSchema } from "@/lib/validation/assignment";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function parseId(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const id = Number(value);

  return Number.isSafeInteger(id) ? id : null;
}

// GET /api/assignments/[id]
export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const { id: rawId } = await context.params;
    const id = parseId(rawId);

    if (!id) {
      return NextResponse.json(
        { error: "Invalid assignment ID." },
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
      .from("investigator_assignment")
      .select("*")
      .eq("assignment_id", id)
      .maybeSingle();

    if (error) {
      console.error("Assignment fetch failed:", error.message);

      return NextResponse.json(
        { error: "Unable to fetch assignment." },
        { status: error.code === "42501" ? 403 : 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Assignment not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      assignment: data,
    });
  } catch (error) {
    console.error("Assignment GET error:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

// PATCH /api/assignments/[id]
export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const { id: rawId } = await context.params;
    const id = parseId(rawId);

    if (!id) {
      return NextResponse.json(
        { error: "Invalid assignment ID." },
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

    const validation = updateAssignmentSchema.safeParse(body);

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
      .from("investigator_assignment")
      .update(validation.data)
      .eq("assignment_id", id)
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("Assignment update failed:", {
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
        { error: "Unable to update assignment." },
        { status }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Assignment not found or access denied." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Assignment updated successfully.",
      assignment: data,
    });
  } catch (error) {
    console.error("Assignment PATCH error:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

// DELETE /api/assignments/[id]
export async function DELETE(
  _request: Request,
  context: RouteContext
) {
  try {
    const { id: rawId } = await context.params;
    const id = parseId(rawId);

    if (!id) {
      return NextResponse.json(
        { error: "Invalid assignment ID." },
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
      .from("investigator_assignment")
      .delete()
      .eq("assignment_id", id)
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("Assignment deletion failed:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });

      return NextResponse.json(
        { error: "Unable to delete assignment." },
        { status: error.code === "42501" ? 403 : 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Assignment not found or access denied." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Assignment deleted successfully.",
      assignment: data,
    });
  } catch (error) {
    console.error("Assignment DELETE error:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}