import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateCrimeSchema } from "@/lib/validation/crime";

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

// GET /api/crimes/[id]
export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const { id: rawId } = await context.params;
    const id = parseId(rawId);

    if (!id) {
      return NextResponse.json(
        { error: "Invalid crime ID." },
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
      .from("crime")
      .select("*")
      .eq("crime_id", id)
      .maybeSingle();

    if (error) {
      console.error("Crime fetch failed:", error.message);

      return NextResponse.json(
        { error: "Unable to fetch crime." },
        { status: error.code === "42501" ? 403 : 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Crime not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      crime: data,
    });
  } catch (error) {
    console.error("Crime GET error:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

// PATCH /api/crimes/[id]
export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const { id: rawId } = await context.params;
    const id = parseId(rawId);

    if (!id) {
      return NextResponse.json(
        { error: "Invalid crime ID." },
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

    const validation = updateCrimeSchema.safeParse(body);

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
      .from("crime")
      .update(validation.data)
      .eq("crime_id", id)
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("Crime update failed:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });

      let status = 500;

      if (error.code === "42501") status = 403;
      else if (error.code === "23505") status = 409;
      else if (["23514", "23502"].includes(error.code)) status = 400;

      return NextResponse.json(
        { error: "Unable to update crime." },
        { status }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Crime not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Crime updated successfully.",
      crime: data,
    });
  } catch (error) {
    console.error("Crime PATCH error:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

// DELETE /api/crimes/[id]
export async function DELETE(
  _request: Request,
  context: RouteContext
) {
  try {
    const { id: rawId } = await context.params;
    const id = parseId(rawId);

    if (!id) {
      return NextResponse.json(
        { error: "Invalid crime ID." },
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
      .from("crime")
      .delete()
      .eq("crime_id", id)
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("Crime deletion failed:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });

      let status = 500;

      if (error.code === "42501") status = 403;
      else if (error.code === "23503") status = 409;

      return NextResponse.json(
        { error: "Unable to delete crime." },
        { status }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Crime not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Crime deleted successfully.",
      crime: data,
    });
  } catch (error) {
    console.error("Crime DELETE error:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}