
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

type TestRole =
  | "admin"
  | "investigator"
  | "analyst"
  | "analyst2";

const accounts: Record<
  TestRole,
  { email: string | undefined; password: string | undefined }
> = {
  admin: {
    email: process.env.CASEVAULT_TEST_ADMIN_EMAIL,
    password: process.env.CASEVAULT_TEST_ADMIN_PASSWORD,
  },
  investigator: {
    email: process.env.CASEVAULT_TEST_INVESTIGATOR_EMAIL,
    password: process.env.CASEVAULT_TEST_INVESTIGATOR_PASSWORD,
  },
  analyst: {
    email: process.env.CASEVAULT_TEST_ANALYST_EMAIL,
    password: process.env.CASEVAULT_TEST_ANALYST_PASSWORD,
  },
  analyst2: {
    email: process.env.CASEVAULT_TEST_ANALYST2_EMAIL,
    password: process.env.CASEVAULT_TEST_ANALYST2_PASSWORD,
  },
};

const baseUrl =
  process.env.CASEVAULT_TEST_BASE_URL ?? "http://localhost:3000";

export async function createTestSession(role: TestRole) {
  const { email, password } = accounts[role];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!email || !password || !supabaseUrl || !anonKey) {
    throw new Error(
      `Missing test configuration for role: ${role}. Check .env.local.`
    );
  }

  const response = await fetch(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        apikey: anonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    }
  );

  if (!response.ok) {
    throw new Error(`Test login failed for role: ${role}.`);
  }

  const session = await response.json();

  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  const cookieName = `sb-${projectRef}-auth-token`;

  const cookieValue =
    "base64-" +
    Buffer.from(JSON.stringify(session)).toString("base64url");

  return {
    cookie: `${cookieName}=${cookieValue}`,
    baseUrl,
  };
}

export async function apiRequest(
  session: Awaited<ReturnType<typeof createTestSession>>,
  path: string,
  options: RequestInit = {}
) {
  return fetch(`${session.baseUrl}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      Cookie: session.cookie,
      "Content-Type": "application/json",
    },
  });
}
