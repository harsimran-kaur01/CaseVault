import { describe, it, expect } from "vitest";
import { createTestSession, apiRequest } from "../helpers/auth";

const validReport = {
  conclusion: "Automated security test",
  summary: "Permission test only.",
  report_type: "DIGITAL",
  confidence: 0.95,
  details: {},
  findings: [
    {
      description: "Test finding",
      significance: "Test significance",
    },
  ],
};

describe("Forensic Report Permissions", () => {
  it("should prevent an analyst from submitting a report for another analyst's test", async () => {
    const session = await createTestSession("analyst2");

    const response = await apiRequest(
      session,
      "/api/forensic-reports",
      {
        method: "POST",
        body: JSON.stringify({
          ...validReport,
          test_id: 4,
        }),
      }
    );

    expect(response.status).toBe(403);
  });

  it("should reject report submission for an already completed test", async () => {
    const session = await createTestSession("analyst2");

    const response = await apiRequest(
      session,
      "/api/forensic-reports",
      {
        method: "POST",
        body: JSON.stringify({
          ...validReport,
          test_id: 6,
        }),
      }
    );

    expect(response.status).toBe(409);
  });

  it("should prevent investigators from submitting forensic reports", async () => {
    const session = await createTestSession("investigator");

    const response = await apiRequest(
      session,
      "/api/forensic-reports",
      {
        method: "POST",
        body: JSON.stringify({
          ...validReport,
          test_id: 4,
        }),
      }
    );

    expect(response.status).toBe(403);
  });

  it("should prevent an analyst from viewing another analyst's report", async () => {
    const session = await createTestSession("analyst");

    // Report 15 belongs to the second analyst.
    const response = await apiRequest(
      session,
      "/api/forensic-reports/15"
    );

    expect(response.status).toBe(404);
  });

  it("should allow the assigned analyst to retrieve their report", async () => {
    const session = await createTestSession("analyst2");

    const response = await apiRequest(
      session,
      "/api/forensic-reports/15"
    );

    expect(response.status).toBe(200);

    const result = await response.json();
    expect(result.success).toBe(true);
  });

  it("should reject unsupported report modification methods", async () => {
    const session = await createTestSession("analyst2");

    const patchResponse = await apiRequest(
      session,
      "/api/forensic-reports/15",
      {
        method: "PATCH",
        body: JSON.stringify({ conclusion: "Modified" }),
      }
    );

    const deleteResponse = await apiRequest(
      session,
      "/api/forensic-reports/15",
      { method: "DELETE" }
    );

    expect(patchResponse.status).toBe(405);
    expect(deleteResponse.status).toBe(405);
  });
});