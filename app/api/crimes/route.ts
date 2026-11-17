import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCrimeSchema } from "@/lib/validation/crime";

// GET /api/crimes
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
      .from("crime")
      .select("*")
      .order("crime_id", { ascending: true })
      .limit(100);

    if (error) {
      console.error("Crime fetch failed:", error.message);

      return NextResponse.json(
        { error: "Unable to fetch crimes." },
        { status: error.code === "42501" ? 403 : 500 }
      );
    }

    return NextResponse.json({
      success: true,
      total: data.length,
      crimes: data,
    });
  } catch (error) {
    console.error("Crime GET error:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

// POST /api/crimes
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

    const validation = createCrimeSchema.safeParse(body);

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
      .insert(validation.data)
      .select("*")
      .single();

    if (error) {
      console.error("Crime creation failed:", {
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
        { error: "Unable to create crime." },
        { status }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Crime created successfully.",
        crime: data,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Crime POST error:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}