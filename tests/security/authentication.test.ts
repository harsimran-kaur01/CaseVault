
import { describe, it, expect } from "vitest";

const BASE_URL = "http://localhost:3000";

describe("API Authentication Security", () => {
  it("should reject unauthenticated forensic test requests", async () => {
    const response = await fetch(
      `${BASE_URL}/api/forensic-tests`
    );

    expect(response.status).toBe(401);
  });

  it("should reject unauthenticated forensic report requests", async () => {
    const response = await fetch(
      `${BASE_URL}/api/forensic-reports`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      }
    );

    expect(response.status).toBe(401);
  });
});
