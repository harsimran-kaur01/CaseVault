
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPersonSchema } from "@/lib/validation/person";

const personColumns = `
  person_id,
  first_name,
  middle_name,
  last_name,
  full_name,
  location_id,
  date_of_birth,
  gender,
  email,
  phone_no
`;

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const { data: people, error } = await supabase
      .from("person")
      .select(personColumns)
      .order("person_id", { ascending: true })
      .limit(100);

    if (error) {
      console.error("People retrieval failed:", error.message);

      return NextResponse.json(
        { error: "Unable to retrieve people." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      total: people.length,
      people,
    });
  } catch (error) {
    console.error("GET /api/people failed:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    let body;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    const validation = createPersonSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed.",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { data: person, error } = await supabase
      .from("person")
      .insert(validation.data)
      .select(personColumns)
      .single();

    if (error) {
      console.error("Person creation failed:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        });

      if (error.code === "42501") {
        return NextResponse.json(
          { error: "You do not have permission to create people." },
          { status: 403 }
        );
      }

      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A person with this email already exists." },
          { status: 409 }
        );
      }

      if (error.code === "23503") {
        return NextResponse.json(
          { error: "The specified location does not exist." },
          { status: 400 }
        );
      }

      if (error.code === "23514" || error.code === "23502") {
        return NextResponse.json(
          { error: "Person data violates a database constraint." },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Unable to create person." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Person created successfully.",
        person,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/people failed:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
