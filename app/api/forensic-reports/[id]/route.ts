import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import clientPromise from "@/lib/mongodb";

type RouteContext = { params: Promise<{ id: string }> };

const MONGO_DB = process.env.MONGODB_DB!;
const MONGO_COLLECTION = "forensic_reports";

const PG_SELECT =
  "report_id, test_id, conclusion, examiner_id, report_date, summary, notes, mongo_report_id";

// ---------------------------------------------------------------------------
// GET /api/forensic-reports/[id]
// ---------------------------------------------------------------------------
export async function GET(
  _request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;
    const reportId = Number(id);

    if (!Number.isSafeInteger(reportId) || reportId <= 0) {
      return NextResponse.json(
        { error: "Invalid report ID." },
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

    // Fetch from PostgreSQL (RLS applies)
    const { data: pgReport, error: pgError } = await supabase
      .from("forensic_report")
      .select(PG_SELECT)
      .eq("report_id", reportId)
      .maybeSingle();

    if (pgError) {
      console.error("Forensic report retrieval failed:", pgError.message);
      return NextResponse.json(
        { error: "Unable to retrieve forensic report." },
        { status: 500 }
      );
    }

    if (!pgReport) {
      return NextResponse.json(
        { error: "Forensic report not found or access denied." },
        { status: 404 }
      );
    }

    // Fetch linked MongoDB document by report_id
    const mongo = (await clientPromise).db(MONGO_DB);
    const mongoDoc = await mongo
      .collection(MONGO_COLLECTION)
      .findOne({ report_id: reportId });

    if (!mongoDoc) {
      // Return PostgreSQL record with an explicit null for mongo_document
      // rather than crashing — the data is still useful.
      console.warn(`MongoDB document missing for report_id ${reportId}`);
      return NextResponse.json({
        success: true,
        report: pgReport,
        mongo_document: null,
        warning: "MongoDB document not found for this report.",
      });
    }

    return NextResponse.json({
      success: true,
      report: pgReport,
      mongo_document: mongoDoc,
    });
  } catch (error) {
    console.error("GET /api/forensic-reports/[id] failed:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
