
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import clientPromise from "@/lib/mongodb";
import { createForensicReportSchema } from "@/lib/validation/forensic-report";
import { ObjectId } from "mongodb";

const MONGO_DB = process.env.MONGODB_DB!;
const MONGO_COLLECTION = "forensic_reports";

const PG_SELECT =
  "report_id, test_id, conclusion, examiner_id, report_date, summary, notes, mongo_report_id";

// ---------------------------------------------------------------------------
// GET /api/forensic-reports
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    const supabase = await createClient();

    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const { data: pgReports, error: pgError } = await supabase
      .from("forensic_report")
      .select(PG_SELECT)
      .order("report_date", { ascending: false });

    if (pgError) {
      console.error("Forensic report retrieval failed:", pgError.message);

      return NextResponse.json(
        { error: "Unable to retrieve forensic reports." },
        { status: 500 }
      );
    }

    if (!pgReports || pgReports.length === 0) {
      return NextResponse.json({
        success: true,
        total: 0,
        reports: [],
      });
    }

    const reportIds = pgReports.map((r) => r.report_id);

    const mongo = (await clientPromise).db(MONGO_DB);

    const mongoDocs = await mongo
      .collection(MONGO_COLLECTION)
      .find({ report_id: { $in: reportIds } })
      .toArray();

    const mongoMap = new Map(
      mongoDocs.map((doc) => [doc.report_id as number, doc])
    );

    const reports = pgReports.map((pg) => {
      const mongoDoc = mongoMap.get(pg.report_id);

      return {
        ...pg,
        mongo_document: mongoDoc
          ? { ...mongoDoc, _id: mongoDoc._id.toHexString() }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      total: reports.length,
      reports,
    });
  } catch (error) {
    console.error("GET /api/forensic-reports failed:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/forensic-reports
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    // 2. Retrieve the authenticated user's application profile
    const { data: profile, error: profileError } = await supabase
      .from("app_user")
      .select("person_id, app_role")
      .eq("user_id", authData.user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (profileError) {
      console.error("Examiner profile lookup failed:", profileError.message);

      return NextResponse.json(
        { error: "Unable to verify examiner identity." },
        { status: 500 }
      );
    }

    if (!profile) {
      return NextResponse.json(
        { error: "Active application profile not found." },
        { status: 403 }
      );
    }

    if (profile.app_role !== "forensic_analyst") {
      return NextResponse.json(
        { error: "Only forensic analysts can submit reports." },
        { status: 403 }
      );
    }

    const examinerId = profile.person_id;

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

    // 4. Validate request body
    const validation = createForensicReportSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed.",
          details: validation.error.issues.map((issue) => ({
            path: issue.path,
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    const {
      test_id,
      conclusion,
      summary,
      notes,
      report_type,
      confidence,
      details,
      findings,
    } = validation.data;

    // 5. Verify forensic test is accessible through RLS
    const { data: test, error: testError } = await supabase
      .from("forensic_test")
      .select("test_id, evidence_id, status, assigned_examiner_id")
      .eq("test_id", test_id)
      .maybeSingle();

    if (testError) {
      console.error("Forensic test lookup failed:", testError.message);

      return NextResponse.json(
        { error: "Unable to verify forensic test." },
        { status: 500 }
      );
    }
    if (!test) {
      return NextResponse.json(
        { error: "Forensic test not found or access denied." },
        { status: 404 }
      );
    }
    if (test.assigned_examiner_id !== examinerId) {
      return NextResponse.json(
        {
          error: "You are not assigned to this forensic test.",
        },
        { status: 403 }
      );
    }


    if (test.status === "cancelled") {
      return NextResponse.json(
        {
          error: "Reports cannot be submitted for cancelled forensic tests.",
        },
        { status: 422 }
      );
    }

    if (test.status === "completed") {
      return NextResponse.json(
        {
          error: "This forensic test has already been completed.",
        },
        { status: 409 }
      );
    }

    // 6. Retrieve case_id for the MongoDB document
    const { data: evidence, error: evidenceError } = await supabase
      .from("evidence")
      .select("case_id")
      .eq("evidence_id", test.evidence_id)
      .maybeSingle();

    if (evidenceError || !evidence) {
      console.error("Evidence lookup failed:", evidenceError?.message);

      return NextResponse.json(
        { error: "Unable to verify the evidence record." },
        { status: 500 }
      );
    }

    const caseId = evidence.case_id;

    // 7. Insert PostgreSQL report with no MongoDB reference.
    // The completion trigger must not complete the test at this stage.
    const { data: pgReport, error: pgInsertError } = await supabase
      .from("forensic_report")
      .insert({
        test_id,
        conclusion,
        examiner_id: examinerId,
        summary: summary ?? null,
        notes: notes ?? null,
        mongo_report_id: null,
      })
      .select(PG_SELECT)
      .single();

    if (pgInsertError) {
      console.error("PostgreSQL report insert failed:", pgInsertError.message);

      if (pgInsertError.code === "42501") {
        return NextResponse.json(
          { error: "You do not have permission to create a forensic report." },
          { status: 403 }
        );
      }

      if (pgInsertError.code === "23505") {
        return NextResponse.json(
          { error: "A report already exists for this forensic test." },
          { status: 409 }
        );
      }

      if (pgInsertError.code === "23503") {
        return NextResponse.json(
          { error: "Invalid test or examiner reference." },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Unable to create forensic report." },
        { status: 500 }
      );
    }

    // 8. Insert MongoDB report document
    const mongo = (await clientPromise).db(MONGO_DB);
    const collection = mongo.collection(MONGO_COLLECTION);

    const mongoDoc = {
      report_id: pgReport.report_id,
      test_id,
      evidence_id: test.evidence_id,
      case_id: caseId,
      examiner_id: examinerId,
      report_type,
      confidence,
      details,
      findings,
      created_at: new Date(),
    };

    let mongoInsertedId: ObjectId;

    try {
      const mongoResult = await collection.insertOne(mongoDoc);
      mongoInsertedId = mongoResult.insertedId;
    } catch (mongoError) {
      console.error("MongoDB report insertion failed:", mongoError);

      const { data: cleaned, error: cleanupError } = await supabase.rpc(
        "cleanup_unlinked_forensic_report",
        { p_report_id: pgReport.report_id }
      );

      if (cleanupError || cleaned !== true) {
        console.error("PostgreSQL report cleanup failed:", cleanupError?.message);

        return NextResponse.json(
          {
            error: "MongoDB insertion failed and PostgreSQL cleanup requires attention.",
            report_id: pgReport.report_id,
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          error: "MongoDB report insertion failed. PostgreSQL report was cleaned up.",
        },
        { status: 500 }
      );
    }

    // 9. Link MongoDB document to PostgreSQL report.
    // The database trigger completes the forensic test after this update.
    const mongoIdHex = mongoInsertedId.toHexString();

    const { data: finalReport, error: updateError } = await supabase
      .from("forensic_report")
      .update({ mongo_report_id: mongoIdHex })
      .eq("report_id", pgReport.report_id)
      .select(PG_SELECT)
      .single();

    if (updateError || !finalReport) {
      console.error("MongoDB reference update failed:", updateError?.message);

      // Compensate for the failed PostgreSQL update.
      let mongoCleanupSucceeded = false;
      let pgCleanupSucceeded = false;

      try {
        const mongoCleanup = await collection.deleteOne({
          _id: mongoInsertedId,
        });

        mongoCleanupSucceeded = mongoCleanup.deletedCount === 1;
      } catch (cleanupError) {
        console.error("MongoDB cleanup failed:", cleanupError);
      }

      const { data: cleaned, error: pgCleanupError } = await supabase.rpc(
        "cleanup_unlinked_forensic_report",
        { p_report_id: pgReport.report_id }
      );

      pgCleanupSucceeded = !pgCleanupError && cleaned === true;

      if (!pgCleanupSucceeded) {
        console.error(
          "PostgreSQL cleanup failed:",
          pgCleanupError?.message
        );
      }

      return NextResponse.json(
        {
          error: "Failed to link the MongoDB report document.",
          mongo_cleanup_succeeded: mongoCleanupSucceeded,
          postgres_cleanup_succeeded: pgCleanupSucceeded,
          report_id: pgReport.report_id,
        },
        { status: 500 }
      );
    }

    // 10. Verify test completion
    const { data: completedTest, error: completionError } = await supabase
      .from("forensic_test")
      .select("test_id, status")
      .eq("test_id", test_id)
      .maybeSingle();

    if (completionError || completedTest?.status !== "completed") {
      console.error(
        "Forensic test completion verification failed:",
        completionError?.message
      );

      return NextResponse.json(
        {
          success: true,
          message: "Report stored, but test completion requires verification.",
          report: finalReport,
          mongo_document: {
            ...mongoDoc,
            _id: mongoInsertedId.toHexString(),
          },
          warning: "Report storage succeeded, but completion status was not confirmed.",
        },
        { status: 201 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Forensic report created successfully.",
        report: finalReport,
        mongo_document: {
          ...mongoDoc,
          _id: mongoInsertedId.toHexString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/forensic-reports failed:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
