import { describe, it, expect } from "vitest";
import { createTestSession, apiRequest } from "../helpers/auth";

describe("Forensic Test Permissions", () => {
  it("should prevent an analyst from updating a test assigned to another analyst", async () => {
    const session = await createTestSession("analyst2");

    // Test 4 is assigned to the first analyst, not analyst2.
    const response = await apiRequest(
      session,
      "/api/forensic-tests/4",
      {
        method: "PATCH",
        body: JSON.stringify({
          notes: "Automated permission test",
        }),
      }
    );

    expect(response.status).toBe(404);
  });

  it("should reject attempts to change protected fields", async () => {
    const session = await createTestSession("analyst2");

    const response = await apiRequest(
      session,
      "/api/forensic-tests/6",
      {
        method: "PATCH",
        body: JSON.stringify({
          status: "in_progress",
        }),
      }
    );

    expect(response.status).toBe(400);
  });

  it("should prevent an analyst from assigning an examiner", async () => {
    const session = await createTestSession("analyst2");

    const response = await apiRequest(
      session,
      "/api/forensic-tests/4/assignment",
      {
        method: "POST",
        body: JSON.stringify({
          examiner_id: 4,
        }),
      }
    );

    expect(response.status).toBe(403);
  });
});