#!/usr/bin/env node
/**
 * Create (or update) an application user.
 *
 *   npm run create-user -- --username admin --password 'S3cure-Pass' --name "مسؤول النظام" --role admin
 *   npm run create-user -- --email someone@example.com --password '...' --role admin   (log in with the email)
 *
 * Runs locally with the service-role key from .env.local. Never run this in the browser.
 */
import { createClient } from "@supabase/supabase-js";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    username: { type: "string" },
    email: { type: "string" },
    password: { type: "string" },
    name: { type: "string", default: "" },
    role: { type: "string", default: "staff" },
  },
});

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const domain = process.env.AUTH_EMAIL_DOMAIN || "mamachurch.local";

function fail(msg) {
  console.error(`✖ ${msg}`);
  process.exit(1);
}

if (!url || !serviceKey) fail("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (see .env.example).");
const emailArg = values.email?.trim().toLowerCase();
if (emailArg && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailArg)) fail("--email is not a valid email address.");
const username = (values.username ?? emailArg?.split("@")[0])?.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
if (!username || !/^[a-z0-9._-]{3,32}$/.test(username)) fail("--username must be 3–32 chars: a-z 0-9 . _ -");
if (!values.password || values.password.length < 8) fail("--password must be at least 8 characters.");
if (!["admin", "staff"].includes(values.role)) fail("--role must be admin or staff.");

const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const email = emailArg ?? `${username}@${domain}`;

const { data: created, error } = await supabase.auth.admin.createUser({
  email,
  password: values.password,
  email_confirm: true,
  user_metadata: { username, full_name: values.name },
  app_metadata: { role: values.role },
});

let userId = created?.user?.id;

if (error) {
  if (!/already|registered|exists/i.test(error.message)) fail(error.message);
  // Existing user → update password / role / name.
  let page = 1;
  while (!userId) {
    const { data, error: listError } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (listError) fail(listError.message);
    userId = data.users.find((u) => u.email === email)?.id;
    if (data.users.length < 200) break;
    page++;
  }
  if (!userId) fail("User exists but could not be found.");
  const { error: updError } = await supabase.auth.admin.updateUserById(userId, {
    password: values.password,
    user_metadata: { username, full_name: values.name },
    app_metadata: { role: values.role },
  });
  if (updError) fail(updError.message);
  console.log(`↻ Updated existing user "${username}".`);
} else {
  console.log(`✔ Created user "${username}".`);
}

// Make sure the profile row reflects the requested role/name (requires schema.sql to be applied).
const { error: profileError } = await supabase
  .from("profiles")
  .upsert({ id: userId, username, full_name: values.name, role: values.role, is_active: true }, { onConflict: "id" });
if (profileError) {
  console.warn(`! Could not update profile (${profileError.message}). Did you run supabase/schema.sql?`);
} else {
  console.log(`✔ Profile ready (role: ${values.role}).`);
}
