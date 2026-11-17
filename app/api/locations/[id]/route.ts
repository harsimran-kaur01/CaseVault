import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateLocationSchema } from "@/lib/validation/location";

type RouteContext = { params: Promise<{ id: string }> };

const PG_SELECT = "location_id, address, city, state, pincode";

// ---------------------------------------------------------------------------
// GET /api/locations/[id]
// ---------------------------------------------------------------------------
export async function GET(
  _request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;
    const locationId = Number(id);

    if (!Number.isSafeInteger(locationId) || locationId <= 0) {
      return NextResponse.json(
        { error: "Invalid location ID." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const { data: location, error: pgError } = await supabase
      .from("location")
      .select(PG_SELECT)
      .eq("location_id", locationId)
      .maybeSingle();

    if (pgError) {
      console.error("Location retrieval failed:", pgError.message);
      return NextResponse.json(
        { error: "Unable to retrieve location." },
        { status: 500 }
      );
    }

    if (!location) {
      return NextResponse.json(
        { error: "Location not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, location });
  } catch (error) {
    console.error("GET /api/locations/[id] failed:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/locations/[id]
// Updatable: address, city, state, pincode
// Not updatable: location_id
// ---------------------------------------------------------------------------
export async function PATCH(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;
    const locationId = Number(id);

    if (!Number.isSafeInteger(locationId) || locationId <= 0) {
      return NextResponse.json(
        { error: "Invalid location ID." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: authData, error: authError } = await supabase.auth.getUser();
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

    const validation = updateLocationSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed.",
          details: validation.error.issues.map((i) => ({
            path: i.path,
            message: i.message,
          })),
        },
        { status: 400 }
      );
    }

    const { data: location, error: updateError } = await supabase
      .from("location")
      .update(validation.data)
      .eq("location_id", locationId)
      .select(PG_SELECT)
      .maybeSingle();

    if (updateError) {
      console.error("Location update failed:", updateError.message);

      if (updateError.code === "42501") {
        return NextResponse.json(
          { error: "You do not have permission to update this location." },
          { status: 403 }
        );
      }
      if (updateError.code === "23505") {
        return NextResponse.json(
          { error: "A location with these details already exists." },
          { status: 409 }
        );
      }
      if (updateError.code === "22001") {
        return NextResponse.json(
          { error: "A field value exceeds the maximum allowed length." },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Unable to update location." },
        { status: 500 }
      );
    }

    if (!location) {
      return NextResponse.json(
        { error: "Location not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, location });
  } catch (error) {
    console.error("PATCH /api/locations/[id] failed:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/locations/[id]
// RLS permits DELETE for all authenticated roles (verified live).
// PostgreSQL enforces FK constraints — returns 23503 if location is referenced.
// ---------------------------------------------------------------------------
export async function DELETE(
  _request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;
    const locationId = Number(id);

    if (!Number.isSafeInteger(locationId) || locationId <= 0) {
      return NextResponse.json(
        { error: "Invalid location ID." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    // Delete and return the deleted row to distinguish 404 from success.
    const { data: deleted, error: deleteError } = await supabase
      .from("location")
      .delete()
      .eq("location_id", locationId)
      .select(PG_SELECT)
      .maybeSingle();

    if (deleteError) {
      console.error("Location delete failed:", deleteError.message);

      if (deleteError.code === "42501") {
        return NextResponse.json(
          { error: "You do not have permission to delete this location." },
          { status: 403 }
        );
      }
      // FK violation: location is referenced by crime_scene or another table.
      if (deleteError.code === "23503") {
        return NextResponse.json(
          {
            error:
              "Cannot delete this location because it is referenced by one or more records.",
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "Unable to delete location." },
        { status: 500 }
      );
    }

    if (!deleted) {
      return NextResponse.json(
        { error: "Location not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Location deleted successfully.",
      location: deleted,
    });
  } catch (error) {
    console.error("DELETE /api/locations/[id] failed:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
