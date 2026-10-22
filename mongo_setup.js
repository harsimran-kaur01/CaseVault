// =====================================================================
// mongo_setup.js  |  CaseVault NoSQL layer (MongoDB Atlas)
// Run:  mongosh "<MONGODB_URI>" --file mongo_setup.js
//
// WHY MongoDB for these four collections (justification for the report):
//   interview_transcripts : long, nested free text -> document model; text search
//   forensic_reports      : every test type has DIFFERENT fields (DNA vs fingerprint
//                           vs digital) -> flexible schema, no sparse SQL columns
//   evidence_metadata     : attributes vary per evidence type (phone IMEI vs weapon serial)
//   activity_logs         : high-volume append-only writes, TTL auto-expiry
// Links to SQL: case_id, interview_id, test_id, evidence_id, report_id are the
// PostgreSQL primary keys. PostgreSQL stores the Mongo _id in
// interview.mongo_transcript_id and forensic_report.mongo_report_id.
// =====================================================================

const d = db.getSiblingDB("casevault");
const oid = (prefix, n) => ObjectId(prefix + "0".repeat(20) + n);   // 3 + 20 + 1 = 24 hex chars

// ---------- 0. reset ----------
// ["interview_transcripts", "forensic_reports", "evidence_metadata", "activity_logs"]
//   .forEach(n => d.getCollection(n).drop());

// ---------- 1. collections with $jsonSchema validation ----------
d.createCollection("interview_transcripts", {
  validator: { $jsonSchema: {
    bsonType: "object",
    required: ["interview_id", "case_id", "person_id", "transcript", "created_at"],
    properties: {
      interview_id: { bsonType: "number" },
      case_id:      { bsonType: "number" },
      person_id:    { bsonType: "number" },
      language:     { bsonType: "string" },
      transcript:   { bsonType: "array", minItems: 1,
        items: { bsonType: "object", required: ["speaker", "text"],
                 properties: { speaker: { enum: ["Investigator", "Interviewee"] },
                               offset_sec: { bsonType: "number" },
                               text: { bsonType: "string" } } } },
      summary:      { bsonType: "string" },
      keywords:     { bsonType: "array", items: { bsonType: "string" } },
      created_at:   { bsonType: "date" }
    } } }
});

d.createCollection("forensic_reports", {
  validator: { $jsonSchema: {
    bsonType: "object",
    required: ["report_id", "test_id", "evidence_id", "case_id", "report_type", "details", "created_at"],
    properties: {
      report_type: { enum: ["DNA", "FINGERPRINT", "DIGITAL", "CHEMICAL", "TOOLMARK", "BALLISTICS"] },
      confidence:  { bsonType: "number", minimum: 0, maximum: 1 },
      details:     { bsonType: "object" },
      findings:    { bsonType: "array" },
      created_at:  { bsonType: "date" }
    } } }
});

d.createCollection("evidence_metadata", {
  validator: { $jsonSchema: {
    bsonType: "object",
    required: ["evidence_id", "evidence_type", "attributes"],
    properties: { evidence_id: { bsonType: "number" }, attributes: { bsonType: "object" },
                  tags: { bsonType: "array", items: { bsonType: "string" } } } } }
});

d.createCollection("activity_logs", {
  validator: { $jsonSchema: {
    bsonType: "object",
    required: ["user_id", "action", "created_at"],
    properties: { user_id: { bsonType: "string" }, action: { bsonType: "string" },
                  created_at: { bsonType: "date" } } } }
});

// ---------- 2. indexes ----------
d.interview_transcripts.createIndex({ interview_id: 1 }, { unique: true });
d.interview_transcripts.createIndex({ case_id: 1, created_at: -1 });
d.interview_transcripts.createIndex({ keywords: 1 });                              // multikey
d.interview_transcripts.createIndex({ "transcript.text": "text", summary: "text" },
                                    { name: "txt_transcripts" });                  // full-text

d.forensic_reports.createIndex({ report_id: 1 }, { unique: true });
d.forensic_reports.createIndex({ test_id: 1 },   { unique: true });
d.forensic_reports.createIndex({ case_id: 1, report_type: 1 });
d.forensic_reports.createIndex({ "findings.description": "text" }, { name: "txt_findings" });

d.evidence_metadata.createIndex({ evidence_id: 1 }, { unique: true });
d.evidence_metadata.createIndex({ "attributes.imei": 1 },
    { partialFilterExpression: { evidence_type: "digital" } });                    // partial index
d.evidence_metadata.createIndex({ tags: 1 });

d.activity_logs.createIndex({ user_id: 1, created_at: -1 });
d.activity_logs.createIndex({ created_at: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 365 }); // TTL 1 year

// ---------- 3. sample data (ids line up with the SQL seed) ----------
d.interview_transcripts.insertMany([
  { _id: oid("65f", 1), interview_id: 1, case_id: 1, person_id: 7, language: "en",
    transcript: [
      { speaker: "Investigator", offset_sec: 0,  text: "Tell me what you saw near the jewellery shop that night." },
      { speaker: "Interviewee",  offset_sec: 12, text: "Around midnight two men were carrying a long steel rod down the rear lane." },
      { speaker: "Interviewee",  offset_sec: 40, text: "They left on a black motorbike without any number plate." } ],
    summary: "Witness saw two men with a crowbar leaving the rear lane on a black motorbike at midnight.",
    keywords: ["crowbar", "motorbike", "midnight", "rear lane"], sentiment: "neutral",
    attachments: [{ type: "audio", path: "recordings/int1.mp3" }],
    created_at: new Date("2026-08-15T11:30:00+05:30") },
  { _id: oid("65f", 2), interview_id: 2, case_id: 1, person_id: 9, language: "en",
    transcript: [
      { speaker: "Investigator", offset_sec: 0,  text: "Please list what was stolen." },
      { speaker: "Interviewee",  offset_sec: 9,  text: "Gold chains, bangles and about forty rings from the main display." } ],
    summary: "Owner lists stolen gold chains, bangles and rings.",
    keywords: ["gold", "chains", "rings", "display"], sentiment: "distressed",
    attachments: [{ type: "audio", path: "recordings/int2.mp3" }],
    created_at: new Date("2026-08-15T15:30:00+05:30") },
  { _id: oid("65f", 3), interview_id: 3, case_id: 2, person_id: 10, language: "en",
    transcript: [
      { speaker: "Investigator", offset_sec: 0,  text: "What happened outside the club?" },
      { speaker: "Interviewee",  offset_sec: 7,  text: "A man hit him with a broken bottle and ran to a black motorbike." } ],
    summary: "Valet saw attacker use a broken bottle and flee on a black motorbike.",
    keywords: ["bottle", "motorbike", "attacker"], sentiment: "anxious",
    attachments: [{ type: "audio", path: "recordings/int3.mp3" }],
    created_at: new Date("2026-09-02T10:30:00+05:30") },
  { _id: oid("65f", 4), interview_id: 4, case_id: 2, person_id: 5, language: "en",
    transcript: [
      { speaker: "Investigator", offset_sec: 0,  text: "Where were you at 2 AM on September 2nd?" },
      { speaker: "Interviewee",  offset_sec: 6,  text: "I was at home asleep. I have nothing to do with this." } ],
    summary: "Suspect denies involvement and claims to have been at home.",
    keywords: ["alibi", "denial", "home"], sentiment: "defensive",
    attachments: [{ type: "audio", path: "recordings/int4.mp3" }],
    created_at: new Date("2026-09-05T12:30:00+05:30") },
  { _id: oid("65f", 5), interview_id: 5, case_id: 3, person_id: 12, language: "en",
    transcript: [
      { speaker: "Investigator", offset_sec: 0,  text: "Will you unlock the laptop for us?" },
      { speaker: "Interviewee",  offset_sec: 5,  text: "No, I want a lawyer present before I give any password." } ],
    summary: "Suspect refuses to unlock the laptop without legal counsel.",
    keywords: ["laptop", "password", "lawyer"], sentiment: "defensive",
    attachments: [{ type: "audio", path: "recordings/int5.mp3" }],
    created_at: new Date("2026-09-26T14:30:00+05:30") }
]);

d.forensic_reports.insertMany([
  { _id: oid("a1b", 1), report_id: 1, test_id: 1, evidence_id: 2, case_id: 1, examiner_id: 4,
    report_type: "FINGERPRINT", confidence: 0.72,
    details: { method: "Ninhydrin + AFIS comparison", ridge_points_matched: 9, print_quality: "partial",
               candidates: [{ person_id: 8, score: 0.87 }, { person_id: 12, score: 0.41 }] },
    findings: [{ description: "Partial print consistent with Suresh Babu", significance: "moderate" }],
    created_at: new Date("2026-08-20T16:00:00+05:30") },
  { _id: oid("a1b", 2), report_id: 2, test_id: 3, evidence_id: 4, case_id: 2, examiner_id: 4,
    report_type: "DNA", confidence: 0.99,
    details: { kit: "GlobalFiler", markers_tested: 16, random_match_probability: "1 in 2.4 billion",
               compared_with: [{ person_id: 5, result: "match" }, { person_id: 10, result: "exclude" }] },
    findings: [{ description: "Blood on bottle matches Vikram Singh", significance: "strong" }],
    created_at: new Date("2026-09-08T17:00:00+05:30") },
  { _id: oid("a1b", 3), report_id: 3, test_id: 5, evidence_id: 8, case_id: 4, examiner_id: 4,
    report_type: "CHEMICAL", confidence: 0.95,
    details: { instrument: "GC-MS", compounds_detected: ["petrol", "kerosene (trace)"], sample_mass_g: 42.5 },
    findings: [{ description: "Petrol-based accelerant present in soil sample", significance: "strong" }],
    created_at: new Date("2025-11-12T12:00:00+05:30") }
]);

d.evidence_metadata.insertMany([
  { evidence_id: 1, evidence_type: "weapon",
    attributes: { material: "steel", length_cm: 61, tool_mark_count: 4, serial_number: null },
    tags: ["crowbar", "burglary"] },
  { evidence_id: 3, evidence_type: "digital",
    attributes: { device: "DVR", brand: "Hikvision", channels: 8, storage_gb: 1000,
                  sha256: "9f2b7c1d0e6a45b3a8c21d77e4f90b12a3c5d6e7f8091a2b3c4d5e6f708192a3" },
    tags: ["cctv", "corrupted-footage"] },
  { evidence_id: 4, evidence_type: "biological",
    attributes: { sample: "blood", volume_ml: 0.4, storage_temp_c: 4, preservative: "none" },
    tags: ["dna", "assault"] },
  { evidence_id: 5, evidence_type: "digital",
    attributes: { device: "smartphone", brand: "Redmi", imei: "356938035643809", os: "Android 13",
                  locked: true, extraction_tool: "pending" },
    tags: ["phone", "assault"] },
  { evidence_id: 6, evidence_type: "digital",
    attributes: { device: "laptop", brand: "Dell", imei: null, disk_encrypted: true, disk_gb: 512,
                  sha256: "1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f809" },
    tags: ["laptop", "fraud", "encrypted"] }
]);

d.activity_logs.insertMany([
  { user_id: "demo-admin",   action: "LOGIN",             entity: "session",  ip: "10.0.0.5", created_at: new Date() },
  { user_id: "demo-priya",   action: "VIEW_CASE",         entity: "cases",    entity_id: 2, created_at: new Date() },
  { user_id: "demo-priya",   action: "SEARCH",            entity: "cases",    meta: { q: "motorbike" }, created_at: new Date() },
  { user_id: "demo-kavita",  action: "TRANSFER_EVIDENCE", entity: "evidence", entity_id: 6, created_at: new Date() },
  { user_id: "demo-kavita",  action: "FILE_REPORT",       entity: "report",   entity_id: 2, created_at: new Date() }
]);

// ---------- 4. aggregation pipelines (screenshot these) ----------
const show = (title, cursor) => { console.log("\n=== " + title); cursor.forEach(x => printjson(x)); };

show("A. Reports per type with average confidence",
  d.forensic_reports.aggregate([
    { $group: { _id: "$report_type", reports: { $sum: 1 }, avg_confidence: { $avg: "$confidence" } } },
    { $sort: { reports: -1 } } ]));

show("B. Keyword frequency per case ($unwind + $group)",
  d.interview_transcripts.aggregate([
    { $unwind: "$keywords" },
    { $group: { _id: { case_id: "$case_id", keyword: "$keywords" }, mentions: { $sum: 1 } } },
    { $sort: { "_id.case_id": 1, mentions: -1 } } ]));

show("C. Full-text search: transcripts mentioning 'motorbike'",
  d.interview_transcripts.find({ $text: { $search: "motorbike" } },
                               { interview_id: 1, case_id: 1, summary: 1, _id: 0 }));

show("D. $lookup: forensic report joined with evidence metadata",
  d.forensic_reports.aggregate([
    { $lookup: { from: "evidence_metadata", localField: "evidence_id", foreignField: "evidence_id", as: "evidence_meta" } },
    { $project: { _id: 0, report_id: 1, report_type: 1, confidence: 1, "evidence_meta.evidence_type": 1, "evidence_meta.tags": 1 } } ]));

show("E. Activity per user and action",
  d.activity_logs.aggregate([
    { $group: { _id: { user: "$user_id", action: "$action" }, n: { $sum: 1 } } },
    { $sort: { "_id.user": 1 } } ]));

// ---------- 5. validation test: this insert MUST fail ----------
try {
  d.forensic_reports.insertOne({ report_id: 99, test_id: 99, evidence_id: 1, case_id: 1,
      report_type: "ASTROLOGY", details: {}, created_at: new Date() });
  console.log("ERROR: validator did not reject the bad report_type");
} catch (e) {
  console.log("\nValidation correctly rejected invalid report_type: " + e.codeName);
}