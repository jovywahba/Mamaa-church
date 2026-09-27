import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Signs out (e.g. deactivated accounts) and returns to the login page. */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const reason = request.nextUrl.searchParams.get("reason");
  const url = new URL("/login", request.url);
  if (reason === "inactive") url.searchParams.set("reason", "inactive");
  return NextResponse.redirect(url);
}
