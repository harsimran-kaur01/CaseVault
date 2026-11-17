
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updatePersonSchema } from "@/lib/validation/person";

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

type RouteContext = {
  params: Promise<{ id: string }>;
};

function validateId(id: string): number | null {
  if (!/^[1-9]\d*$/.test(id)) {
    return null;
  }

  const parsed = Number(id);

  return Number.isSafeInteger(parsed) ? parsed : null;
}

// GET /api/people/[id]
export async function GET(
  _request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;
    const personId = validateId(id);

    if (personId === null) {
      return NextResponse.json(
        { error: "Invalid person ID." },
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

    const { data: person, error } = await supabase
      .from("person")
      .select(personColumns)
      .eq("person_id", personId)
      .maybeSingle();

    if (error) {
      console.error("Person retrieval failed:", error.message);

      return NextResponse.json(
        { error: "Unable to retrieve person." },
        { status: 500 }
      );
    }

    if (!person) {
      return NextResponse.json(
        { error: "Person not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      person,
    });
  } catch (error) {
    console.error("GET /api/people/[id] failed:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

// PATCH /api/people/[id]
export async function PATCH(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;
    const personId = validateId(id);

    if (personId === null) {
      return NextResponse.json(
        { error: "Invalid person ID." },
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

    let body;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    const validation = updatePersonSchema.safeParse(body);

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
      .update(validation.data)
      .eq("person_id", personId)
      .select(personColumns)
      .maybeSingle();

    if (error) {
      console.error("Person update failed:", error.message);

      if (error.code === "42501") {
        return NextResponse.json(
          { error: "You do not have permission to update this person." },
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
        { error: "Unable to update person." },
        { status: 500 }
      );
    }

    if (!person) {
      return NextResponse.json(
        { error: "Person not found or you do not have permission to update it." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Person updated successfully.",
      person,
    });
  } catch (error) {
    console.error("PATCH /api/people/[id] failed:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

// DELETE /api/people/[id]
export async function DELETE(
  _request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;
    const personId = validateId(id);

    if (personId === null) {
      return NextResponse.json(
        { error: "Invalid person ID." },
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

    const { data: deletedPerson, error } = await supabase
      .from("person")
      .delete()
      .eq("person_id", personId)
      .select("person_id, first_name, last_name")
      .maybeSingle();

    if (error) {
      console.error("Person deletion failed:", error.message);

      if (error.code === "42501") {
        return NextResponse.json(
          { error: "You do not have permission to delete people." },
          { status: 403 }
        );
      }

      if (error.code === "23503") {
        return NextResponse.json(
          { error: "This person is referenced by other records and cannot be deleted." },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "Unable to delete person." },
        { status: 500 }
      );
    }

    if (!deletedPerson) {
      return NextResponse.json(
        { error: "Person not found or you do not have permission to delete it." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Person deleted successfully.",
      person: deletedPerson,
    });
  } catch (error) {
    console.error("DELETE /api/people/[id] failed:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
