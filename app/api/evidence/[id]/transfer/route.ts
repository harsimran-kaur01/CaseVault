import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createEvidenceTransferSchema } from "@/lib/validation/evidence-transfer";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(
  request: Request,
  { params }: RouteContext
) {
  try {
    // 1. Validate evidence ID
    const { id } = await params;
    const evidenceId = Number(id);

    if (!Number.isSafeInteger(evidenceId) || evidenceId <= 0) {
      return NextResponse.json(
        { error: "Invalid evidence ID." },
        { status: 400 }
      );
    }

    // 2. Authenticate user
    const supabase = await createClient();

    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
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

    // 4. Validate transfer details
    const validation = createEvidenceTransferSchema.safeParse(body);

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

    // 5. Verify evidence is accessible through RLS before calling RPC
    const { data: evidence, error: evidenceError } = await supabase
      .from("evidence")
      .select("evidence_id")
      .eq("evidence_id", evidenceId)
      .maybeSingle();

    if (evidenceError) {
      console.error("Evidence lookup failed:", evidenceError.message);
      return NextResponse.json(
        { error: "Unable to verify evidence record." },
        { status: 500 }
      );
    }

    if (!evidence) {
      return NextResponse.json(
        { error: "Evidence not found or access denied." },
        { status: 404 }
      );
    }

    // 6. Call the PostgreSQL transfer function via RPC
    const { data: transferId, error: transferError } =
      await supabase.rpc("transfer_evidence", {
        p_evidence_id: evidenceId,
        p_to_person_id: validation.data.to_person_id,
        p_to_location_id: validation.data.to_location_id ?? null,
        p_purpose: validation.data.purpose,
        p_received_condition: validation.data.received_condition ?? "intact",
        p_notes: validation.data.notes ?? null,
      });

    // 7. Map database errors to HTTP responses
    if (transferError) {
      console.error("Evidence transfer failed:", transferError.code, transferError.message);

      // RLS / permission denied
      if (transferError.code === "42501") {
        return NextResponse.json(
          { error: "You do not have permission to transfer this evidence." },
          { status: 403 }
        );
      }

      // Foreign key violation — invalid person/location reference
      if (transferError.code === "23503") {
        return NextResponse.json(
          { error: "Invalid recipient or location reference." },
          { status: 400 }
        );
      }

      // Application-raised exception from transfer_evidence function (SQLSTATE P0001)
      // The function raises distinct messages for: evidence not found vs. same-holder conflict
      if (transferError.code === "P0001") {
        const msg = transferError.message ?? "";

        // "recipient is already the current holder" → 409 Conflict
        if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("current holder")) {
          return NextResponse.json(
            { error: msg },
            { status: 409 }
          );
        }

        // "evidence not found" → 404
        if (msg.toLowerCase().includes("not found") || msg.toLowerCase().includes("does not exist")) {
          return NextResponse.json(
            { error: msg },
            { status: 404 }
          );
        }

        // Any other business rule violation → 409
        return NextResponse.json(
          { error: msg },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "Unable to transfer evidence." },
        { status: 500 }
      );
    }

    // 8. Return success
    return NextResponse.json(
      {
        success: true,
        message: "Evidence transferred successfully.",
        transfer_id: transferId,
      },
      { status: 201 }
    );

  } catch (error) {
    console.error("POST /api/evidence/[id]/transfer failed:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
