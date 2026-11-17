import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAssignmentSchema } from "@/lib/validation/assignment";

// GET /api/assignments
export async function GET() {
  try {
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
      .order("assignment_id", { ascending: true })
      .limit(100);

    if (error) {
      console.error("Assignment fetch failed:", error.message);

      return NextResponse.json(
        { error: "Unable to fetch assignments." },
        { status: error.code === "42501" ? 403 : 500 }
      );
    }

    return NextResponse.json({
      success: true,
      total: data.length,
      assignments: data,
    });
  } catch (error) {
    console.error("Assignment GET error:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

// POST /api/assignments
export async function POST(request: Request) {
  try {
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

    const validation = createAssignmentSchema.safeParse(body);

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
      .insert(validation.data)
      .select("*")
      .single();

    if (error) {
      console.error("Assignment creation failed:", {
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
        { error: "Unable to create assignment." },
        { status }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Assignment created successfully.",
        assignment: data,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Assignment POST error:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}