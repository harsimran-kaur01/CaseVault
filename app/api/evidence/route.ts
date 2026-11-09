
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createEvidenceSchema } from "@/lib/validation/evidence";

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

    const { data: evidence, error } = await supabase
      .from("evidence")
      .select(`
        evidence_id,
        case_id,
        crime_scene_id,
        evidence_code,
        description,
        evidence_type,
        condition_status,
        date_collected,
        collected_by,
        location_found_id,
        sealed,
        notes,
        current_holder_id,
        current_location_id
      `)
      .order("date_collected", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Evidence retrieval failed:", error.message);

      return NextResponse.json(
        { error: "Unable to retrieve evidence records." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      total: evidence.length,
      evidence,
    });
  } catch (error) {
    console.error("GET /api/evidence failed:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    // 2. Retrieve the authenticated user's application profile
    const { data: appUser, error: profileError } = await supabase
      .from("app_user")
      .select("person_id, app_role, is_active")
      .eq("user_id", authData.user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (profileError) {
      console.error("User profile lookup failed:", profileError.message);

      return NextResponse.json(
        { error: "Unable to verify user permissions." },
        { status: 500 }
      );
    }

    if (!appUser) {
      return NextResponse.json(
        { error: "Active application profile not found." },
        { status: 403 }
      );
    }

    if (!["admin", "investigator"].includes(appUser.app_role)) {
      return NextResponse.json(
        { error: "You do not have permission to register evidence." },
        { status: 403 }
      );
    }

    // 3. Parse request body
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    // 4. Validate evidence data
    const validation = createEvidenceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed.",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const input = validation.data;

    // 5. Determine the collector from the authenticated role
    let collectorId: number;

    if (appUser.app_role === "investigator") {
      // Investigators cannot register evidence on behalf of another person.
      if (input.collected_by !== undefined) {
        return NextResponse.json(
          { error: "Investigators cannot specify another collector." },
          { status: 403 }
        );
      }

      collectorId = appUser.person_id;
    } else {
      // Admins must explicitly select an investigator.
      if (input.collected_by === undefined) {
        return NextResponse.json(
          { error: "Select an investigator for evidence registration." },
          { status: 400 }
        );
      }

      collectorId = input.collected_by;
    }

    // 6. Verify that the selected collector is an active investigator
    const { data: collector, error: collectorError } = await supabase
      .from("app_user")
      .select("person_id")
      .eq("person_id", collectorId)
      .eq("app_role", "investigator")
      .eq("is_active", true)
      .maybeSingle();

    if (collectorError) {
      console.error("Collector lookup failed:", collectorError.message);

      return NextResponse.json(
        { error: "Unable to verify the selected investigator." },
        { status: 500 }
      );
    }

    if (!collector) {
      return NextResponse.json(
        { error: "Selected collector is not an active investigator." },
        { status: 400 }
      );
    }

    // 7. Verify that the case exists and is accessible
    const { data: caseRecord, error: caseError } = await supabase
      .from("cases")
      .select("case_id")
      .eq("case_id", input.case_id)
      .maybeSingle();

    if (caseError) {
      console.error("Case lookup failed:", caseError.message);

      return NextResponse.json(
        { error: "Unable to verify the case." },
        { status: 500 }
      );
    }

    if (!caseRecord) {
      return NextResponse.json(
        { error: "Case not found or access denied." },
        { status: 404 }
      );
    }

    // 8. Verify that the selected investigator is assigned to the case
    const { data: assignment, error: assignmentError } = await supabase
      .from("investigator_assignment")
      .select("assignment_id")
      .eq("case_id", input.case_id)
      .eq("investigator_id", collectorId)
      .eq("status", "active")
      .maybeSingle();

    if (assignmentError) {
      console.error("Assignment lookup failed:", assignmentError.message);

      return NextResponse.json(
        { error: "Unable to verify investigator assignment." },
        { status: 500 }
      );
    }

    if (!assignment) {
      return NextResponse.json(
        { error: "The selected investigator is not actively assigned to this case." },
        { status: 403 }
      );
    }

    // 9. Verify that the crime scene belongs to the selected case
    if (input.crime_scene_id != null) {
      const { data: crimeScene, error: sceneError } = await supabase
        .from("crime_scene")
        .select("crime_scene_id")
        .eq("crime_scene_id", input.crime_scene_id)
        .eq("case_id", input.case_id)
        .maybeSingle();

      if (sceneError) {
        console.error("Crime scene lookup failed:", sceneError.message);

        return NextResponse.json(
          { error: "Unable to verify the crime scene." },
          { status: 500 }
        );
      }

      if (!crimeScene) {
        return NextResponse.json(
          { error: "Crime scene does not belong to the selected case or is inaccessible." },
          { status: 400 }
        );
      }
    }

    // 10. Insert evidence with server-controlled initial custody
    const { data: evidence, error: insertError } = await supabase
      .from("evidence")
      .insert({
        case_id: input.case_id,
        crime_scene_id: input.crime_scene_id ?? null,
        evidence_code: input.evidence_code,
        description: input.description,
        evidence_type: input.evidence_type,
        condition_status: input.condition_status,
        date_collected: input.date_collected,
        collected_by: collectorId,
        location_found_id: input.location_found_id ?? null,
        sealed: input.sealed,
        notes: input.notes ?? null,
      })
      .select(`
        evidence_id,
        case_id,
        crime_scene_id,
        evidence_code,
        description,
        evidence_type,
        condition_status,
        date_collected,
        collected_by,
        location_found_id,
        sealed,
        notes,
        current_holder_id,
        current_location_id
      `)
      .single();

    if (insertError) {
      console.error("Evidence registration failed:", insertError.message);

      if (insertError.code === "42501") {
        return NextResponse.json(
          { error: "You do not have permission to register evidence." },
          { status: 403 }
        );
      }

      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "Evidence code already exists." },
          { status: 409 }
        );
      }

      if (insertError.code === "23503") {
        return NextResponse.json(
          { error: "Invalid case, crime scene, person, or location reference." },
          { status: 400 }
        );
      }

      if (insertError.code === "23514") {
        return NextResponse.json(
          { error: "Evidence data violates a database constraint." },
          { status: 400 }
        );
      }

      if (insertError.code === "23502") {
        return NextResponse.json(
          { error: "A required evidence field is missing." },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Unable to register evidence." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Evidence registered successfully.",
        evidence,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/evidence failed:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

