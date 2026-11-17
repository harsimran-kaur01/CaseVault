import { describe, it, expect } from "vitest";
import { createTestSession, apiRequest } from "../helpers/auth";

describe("Admin Permissions", () => {
  it("should allow an admin to retrieve forensic tests", async () => {
    const session = await createTestSession("admin");

    const response = await apiRequest(
      session,
      "/api/forensic-tests"
    );

    expect(response.status).toBe(200);

    const result = await response.json();

    expect(result.success).toBe(true);
    expect(Array.isArray(result.tests)).toBe(true);
  });

  it("should allow an admin to retrieve forensic reports", async () => {
    const session = await createTestSession("admin");

    const response = await apiRequest(
      session,
      "/api/forensic-reports"
    );

    expect(response.status).toBe(200);

    const result = await response.json();

    expect(result.success).toBe(true);
    expect(Array.isArray(result.reports)).toBe(true);
  });
    it("should prevent an admin from reassigning a test that already has a report", async () => {
    const session = await createTestSession("admin");

    // Test 6 has a report and is assigned to examiner 5.
    const response = await apiRequest(
      session,
      "/api/forensic-tests/6/assignment",
      {
        method: "POST",
        body: JSON.stringify({
          examiner_id: 4,
        }),
      }
    );

    expect(response.status).toBe(409);
  });

  it("should reject an invalid examiner ID", async () => {
    const session = await createTestSession("admin");

    const response = await apiRequest(
      session,
      "/api/forensic-tests/6/assignment",
      {
        method: "POST",
        body: JSON.stringify({
          examiner_id: -1,
        }),
      }
    );

    expect(response.status).toBe(400);
  });
  it("should allow an admin to assign an eligible examiner", async () => {
  const session = await createTestSession("admin");

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

  expect(response.status).toBe(200);

  const result = await response.json();

  expect(result.success).toBe(true);
  expect(result.test.assigned_examiner_id).toBe(4);
  });
});