import { describe, it, expect } from "vitest";
import { createTestSession, apiRequest } from "../helpers/auth";

describe("Evidence Permissions", () => {
  it("should allow an admin to retrieve evidence records", async () => {
    const session = await createTestSession("admin");

    const response = await apiRequest(session, "/api/evidence");

    expect(response.status).toBe(200);

    const result = await response.json();

    expect(result.success).toBe(true);
    expect(Array.isArray(result.evidence)).toBe(true);
  });

  it("should allow a forensic analyst to retrieve evidence records", async () => {
    const session = await createTestSession("analyst");

    const response = await apiRequest(session, "/api/evidence");

    expect(response.status).toBe(200);

    const result = await response.json();

    expect(result.success).toBe(true);
    expect(Array.isArray(result.evidence)).toBe(true);
  });

  it("should prevent a forensic analyst from registering evidence", async () => {
    const session = await createTestSession("analyst");

    const response = await apiRequest(session, "/api/evidence", {
      method: "POST",
      body: JSON.stringify({
        case_id: 1,
        evidence_code: "EV-2026-999",
        description: "Automated security test",
        evidence_type: "digital",
        date_collected: "2026-11-09T10:00:00+05:30",
      }),
    });

    expect(response.status).toBe(403);
  });

  it("should prevent an investigator from specifying another collector", async () => {
    const session = await createTestSession("investigator");

    const response = await apiRequest(session, "/api/evidence", {
      method: "POST",
      body: JSON.stringify({
        case_id: 1,
        evidence_code: "EV-2026-998",
        description: "Automated security test",
        evidence_type: "digital",
        date_collected: "2026-11-09T10:00:00+05:30",
        collected_by: 4,
      }),
    });

    expect(response.status).toBe(403);
  });

  it("should reject client-supplied custody fields", async () => {
    const session = await createTestSession("investigator");

    const response = await apiRequest(session, "/api/evidence", {
      method: "POST",
      body: JSON.stringify({
        case_id: 1,
        evidence_code: "EV-2026-997",
        description: "Automated security test",
        evidence_type: "digital",
        date_collected: "2026-11-09T10:00:00+05:30",
        current_holder_id: 4,
        current_location_id: 1,
      }),
    });

    expect(response.status).toBe(400);
  });
  it("should reject unauthenticated evidence retrieval", async () => {
  const response = await fetch(
    "http://localhost:3000/api/evidence"
  );

  expect(response.status).toBe(401);
});

it("should reject an invalid evidence ID", async () => {
  const session = await createTestSession("admin");

  const response = await apiRequest(
    session,
    "/api/evidence/invalid"
  );

  expect(response.status).toBe(400);
});

it("should reject unsupported evidence modification methods", async () => {
  const session = await createTestSession("admin");

  const patchResponse = await apiRequest(
    session,
    "/api/evidence/1",
    {
      method: "PATCH",
      body: JSON.stringify({ description: "Modified" }),
    }
  );

  const deleteResponse = await apiRequest(
    session,
    "/api/evidence/1",
    { method: "DELETE" }
  );

  expect(patchResponse.status).toBe(405);
  expect(deleteResponse.status).toBe(405);
});

it("should prevent forensic analysts from transferring evidence", async () => {
  const session = await createTestSession("analyst");

  const response = await apiRequest(
    session,
    "/api/evidence/1/transfer",
    {
      method: "POST",
      body: JSON.stringify({
        to_person_id: 6,
        to_location_id: null,
        purpose: "Automated permission test",
      }),
    }
  );

  console.log("Transfer response status:", response.status);
  console.log("Transfer response body:", await response.json());

  expect(response.status).toBe(403);
});

it("should reject invalid transfer payloads", async () => {
  const session = await createTestSession("admin");

  const response = await apiRequest(
    session,
    "/api/evidence/1/transfer",
    {
      method: "POST",
      body: JSON.stringify({
        to_person_id: -1,
        to_location_id: null,
        purpose: "",
      }),
    }
  );

  expect(response.status).toBe(400);
  });
});