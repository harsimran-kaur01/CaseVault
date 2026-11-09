import { describe, it, expect } from "vitest";
import { createTestSession, apiRequest } from "../helpers/auth";

describe("Investigator Forensic Test Permissions", () => {
  it("should reject a request for evidence that does not exist or is inaccessible", async () => {
    const session = await createTestSession("investigator");

    const response = await apiRequest(
      session,
      "/api/forensic-tests",
      {
        method: "POST",
        body: JSON.stringify({
          evidence_id: 2147483647,
          test_type: "Automated permission test",
          priority: "medium",
        }),
      }
    );

    expect(response.status).toBe(404);
  });

  it("should reject attempts to supply protected fields", async () => {
    const session = await createTestSession("investigator");

    const response = await apiRequest(
      session,
      "/api/forensic-tests",
      {
        method: "POST",
        body: JSON.stringify({
          evidence_id: 2147483647,
          test_type: "Automated permission test",
          requested_by: 1,
          status: "completed",
          assigned_examiner_id: 4,
        }),
      }
    );

    expect(response.status).toBe(400);
  });

  it("should prevent a forensic analyst from creating test requests", async () => {
    const session = await createTestSession("analyst");

    const response = await apiRequest(
      session,
      "/api/forensic-tests",
      {
        method: "POST",
        body: JSON.stringify({
          evidence_id: 2147483647,
          test_type: "Automated permission test",
        }),
      }
    );

    expect(response.status).toBe(403);
  });
});