
import { describe, it, expect } from "vitest";
import { createTestSession, apiRequest } from "../helpers/auth";

describe("Forensic Analyst Authentication", () => {
  it("should authenticate the first analyst", async () => {
    const session = await createTestSession("analyst");

    const response = await apiRequest(
      session,
      "/api/forensic-tests"
    );

    expect(response.status).toBe(200);

    const result = await response.json();
    expect(result.success).toBe(true);
  });

  it("should authenticate the second analyst", async () => {
    const session = await createTestSession("analyst2");

    const response = await apiRequest(
      session,
      "/api/forensic-tests"
    );

    expect(response.status).toBe(200);

    const result = await response.json();
    expect(result.success).toBe(true);
  });
});
