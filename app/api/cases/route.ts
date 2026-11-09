
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // 1. Verify the authenticated user
    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    // 2. Fetch cases from PostgreSQL
    // Existing RLS policies determine which cases are visible.
    const { data: cases, error: casesError } = await supabase
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
      .order("date_opened", { ascending: false })
      .limit(50);

    if (casesError) {
      console.error("Case retrieval failed:", casesError.message);

      return NextResponse.json(
        { error: "Unable to retrieve cases." },
        { status: 500 }
      );
    }

    // 3. Return the results
    return NextResponse.json({
      success: true,
      total: cases.length,
      cases,
    });

  } catch (error) {
    console.error("GET /api/cases failed:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

import { createCaseSchema } from "@/lib/validation/case";

// Add below your existing GET function

export async function POST(request: Request) {
  try {
    // 1. Initialize Supabase
    const supabase = await createClient();

    // 2. Verify authenticated user
    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    // 3. Parse request body
    let body;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    // 4. Validate input
    const validation = createCaseSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed.",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // 5. Insert case into PostgreSQL
    // RLS ensures only authorized users can create cases.
    const { data: newCase, error: insertError } = await supabase
      .from("cases")
      .insert(validation.data)
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
      .single();

    // 6. Handle database errors
    if (insertError) {
      console.error("Case creation failed:", insertError.message);

      if (insertError.code === "42501") {
        return NextResponse.json(
          { error: "You do not have permission to create cases." },
          { status: 403 }
        );
      }

      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "Case number already exists." },
          { status: 409 }
        );
      }

      if (
        insertError.code === "23503" ||
        insertError.code === "23514" ||
        insertError.code === "23502"
      ) {
        return NextResponse.json(
          { error: "Invalid case data or database constraint violation." },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Unable to create case." },
        { status: 500 }
      );
    }

    // 7. Return created case
    return NextResponse.json(
      {
        success: true,
        message: "Case created successfully.",
        case: newCase,
      },
      { status: 201 }
    );

  } catch (error) {
    console.error("POST /api/cases failed:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
