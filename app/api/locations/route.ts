import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createLocationSchema } from "@/lib/validation/location";

const PG_SELECT = "location_id, address, city, state, pincode";

// ---------------------------------------------------------------------------
// GET /api/locations
// Supports optional ?city= and ?state= filters. Returns up to 100 records.
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const cityFilter = searchParams.get("city");
    const stateFilter = searchParams.get("state");

    let query = supabase
      .from("location")
      .select(PG_SELECT)
      .order("city", { ascending: true })
      .order("location_id", { ascending: true })
      .limit(100);

    if (cityFilter) {
      query = query.ilike("city", `%${cityFilter}%`);
    }
    if (stateFilter) {
      query = query.ilike("state", `%${stateFilter}%`);
    }

    const { data: locations, error: pgError } = await query;

    if (pgError) {
      console.error("Location retrieval failed:", pgError.message);
      return NextResponse.json(
        { error: "Unable to retrieve locations." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      total: locations.length,
      locations,
    });
  } catch (error) {
    console.error("GET /api/locations failed:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/locations
// All authenticated roles may create locations (confirmed by RLS inspection).
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  try {
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

    const validation = createLocationSchema.safeParse(body);
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

    const { data: location, error: insertError } = await supabase
      .from("location")
      .insert(validation.data)
      .select(PG_SELECT)
      .single();

    if (insertError) {
      console.error("Location insert failed:", insertError.message);

      if (insertError.code === "42501") {
        return NextResponse.json(
          { error: "You do not have permission to create a location." },
          { status: 403 }
        );
      }
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "A location with these details already exists." },
          { status: 409 }
        );
      }
      if (insertError.code === "22001") {
        return NextResponse.json(
          { error: "A field value exceeds the maximum allowed length." },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Unable to create location." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Location created successfully.",
        location,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/locations failed:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
