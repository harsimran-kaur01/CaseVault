
import { createClient } from "@supabase/supabase-js";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const url =
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const secret = process.env.SUPABASE_SECRET_KEY ??
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const userId = process.env.TARGET_USER_ID;

if (!url || !secret || !userId) {
  console.error(
    "Missing Supabase URL, server secret, or TARGET_USER_ID in .env.local"
  );
  process.exit(1);
}

const supabase = createClient(url, secret, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const rl = createInterface({ input: stdin, output: stdout });

try {
  const password = await rl.question(
    "Enter a new password (input will be visible): "
  );

  if (password.length < 8) {
    throw new Error("Use a password with at least 8 characters.");
  }

  const { data, error } =
    await supabase.auth.admin.updateUserById(userId, {
      password,
    });

  if (error) throw error;

  console.log("Password updated successfully.");
  console.log("User:", data.user.email);
} catch (error) {
  console.error("Password update failed:", error.message);
  process.exitCode = 1;
} finally {
  rl.close();
}
