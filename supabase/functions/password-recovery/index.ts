import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  throw new Error("Supabase function secrets are not configured.");
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function hashCode(code: string) {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(code))
    .then((hash) =>
      Array.from(new Uint8Array(hash), (byte) =>
        byte.toString(16).padStart(2, "0")
      ).join("")
    );
}

function createRecoveryCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Gebruik een POST-verzoek." }, 405);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Ongeldige aanvraag." }, 400);
  }

  if (!isRecord(body)) {
    return jsonResponse({ error: "Ongeldige aanvraag." }, 400);
  }

  if (body.action === "create") {
    const authorization = request.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Log in om een herstelcode te maken." }, 401);
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: authorization } },
    });
    const token = authorization.slice("Bearer ".length);
    const { data: userData, error: userError } = await authClient.auth.getUser(
      token,
    );
    const user = userData.user;

    if (userError || !user?.email) {
      return jsonResponse({ error: "Je account kon niet worden gecontroleerd. Log opnieuw in." }, 401);
    }

    const code = createRecoveryCode();
    const { error } = await adminClient
      .from("password_recovery_codes")
      .upsert(
        {
          user_id: user.id,
          email: user.email.toLowerCase(),
          code_hash: await hashCode(code),
          claim_token: null,
          claim_expires_at: null,
        },
        { onConflict: "user_id" },
      );

    if (error) {
      console.error("Could not save password recovery code.", error);
      return jsonResponse({ error: "De herstelcode kon niet worden opgeslagen. Probeer het later opnieuw." }, 500);
    }

    return jsonResponse({ recoveryCode: code });
  }

  if (body.action === "reset") {
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const code = typeof body.recoveryCode === "string"
      ? body.recoveryCode.trim().toLowerCase()
      : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (
      !isValidEmail(email) ||
      !/^[0-9a-f]{32}$/.test(code) ||
      password.length < 6
    ) {
      return jsonResponse({ error: "Vul een geldig e-mailadres, herstelcode en wachtwoord van minstens 6 tekens in." }, 400);
    }

    const claimToken = crypto.randomUUID();
    const { data: claims, error: claimError } = await adminClient.rpc(
      "claim_password_recovery",
      {
        p_email: email.toLowerCase(),
        p_code_hash: await hashCode(code),
        p_claim_token: claimToken,
      },
    );

    if (claimError) {
      console.error("Could not check password recovery code.", claimError);
      return jsonResponse({ error: "Wachtwoord herstellen is tijdelijk niet beschikbaar. Probeer het later opnieuw." }, 500);
    }

    const claim = claims?.[0];
    if (!claim) {
      return jsonResponse({ error: "E-mailadres of herstelcode klopt niet, of de code is al gebruikt." }, 400);
    }

    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      claim.recovered_user_id,
      { password },
    );

    const { error: finishError } = await adminClient.rpc(
      "finish_password_recovery",
      {
        p_user_id: claim.recovered_user_id,
        p_claim_token: claim.claim_id,
        p_success: !updateError,
      },
    );

    if (updateError) {
      console.error("Could not update password using recovery code.", updateError);
      if (finishError) {
        console.error("Could not release password recovery code claim.", finishError);
      }
      return jsonResponse({ error: "Het wachtwoord kon niet worden gewijzigd. Probeer het later opnieuw." }, 500);
    }

    if (finishError) {
      console.error("Could not finish password recovery.", finishError);
      return jsonResponse({ error: "Het wachtwoord is gewijzigd, maar de herstelcode kon niet veilig worden afgesloten. Vraag een beheerder om hulp." }, 500);
    }

    return jsonResponse({ message: "Het wachtwoord is gewijzigd. Log nu in met je nieuwe wachtwoord." });
  }

  return jsonResponse({ error: "Onbekende actie." }, 400);
});
