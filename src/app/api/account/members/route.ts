// ============================================================
// GET  /api/account/members — list the caller's account members
// POST /api/account/members — create a login and add them (admin+)
//
// Field visibility on GET
//   Sensitive fields (email) are returned only when the caller is
//   admin+. Agents and viewers see name + avatar + role + joined
//   date only. This mirrors the design decision from the planning
//   phase: "agent/viewer sees names only".
// ============================================================

import { NextResponse } from "next/server";

import {
  getCurrentAccount,
  requireRole,
  toErrorResponse,
} from "@/lib/auth/account";
import { canManageMembers, isAccountRole } from "@/lib/auth/roles";
import { supabaseAdmin } from "@/lib/automations/admin-client";
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import {
  generateTempPassword,
  isValidEmail,
  MAX_FULL_NAME_LEN,
  MIN_MEMBER_PASSWORD,
} from "@/lib/account/provision-member";
import type { AccountMember } from "@/types";

interface ProfileRow {
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  account_role: string;
  created_at: string;
}

export async function GET() {
  try {
    const ctx = await getCurrentAccount();

    // RLS on profiles allows reading any row whose account matches
    // the caller's, so this query is naturally account-scoped.
    const { data, error } = await ctx.supabase
      .from("profiles")
      .select("user_id, full_name, email, avatar_url, account_role, created_at")
      .eq("account_id", ctx.accountId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[GET /api/account/members] fetch error:", error);
      return NextResponse.json(
        { error: "Failed to load members" },
        { status: 500 },
      );
    }

    const canSeeEmails = canManageMembers(ctx.role);

    const members: AccountMember[] = (data as ProfileRow[]).flatMap((row) => {
      // Defensive: the DB enum should never let an unknown role
      // through, but if a migration ever broadens the enum without
      // updating TS, skip the row rather than crash the page.
      if (!isAccountRole(row.account_role)) return [];
      return [
        {
          user_id: row.user_id,
          full_name: row.full_name ?? "",
          email: canSeeEmails ? row.email : null,
          avatar_url: row.avatar_url,
          role: row.account_role,
          joined_at: row.created_at,
        },
      ];
    });

    return NextResponse.json({ members });
  } catch (err) {
    return toErrorResponse(err);
  }
}

// ============================================================
// POST /api/account/members
//
// Owner/admin only. Creates a Supabase Auth login for a teammate
// and attaches it to the caller's account with the given role.
// Returns the generated password ONCE so the admin can hand it
// over — it is never stored anywhere readable and cannot be
// retrieved again (only reset).
//
// Why this exists rather than an invite link: self-service signup
// is disabled on this project, so /join/<token> can only grant a
// role to a login that already exists. See
// `@/lib/account/provision-member` for the full rationale.
//
// Sequence
//   1. admin.createUser(email_confirm: true) — the user can sign
//      in immediately, no confirmation mail required (there is no
//      SMTP configured).
//   2. The `on_auth_user_created` trigger (migration 017) gives
//      them a personal account and an 'owner' profile row.
//   3. Re-point that profile at the caller's account with the
//      requested role, then delete the now-orphaned personal
//      account. This is the same move `redeem_invitation` performs
//      for a self-redeeming invitee, done with the service role
//      because we are acting on someone else's behalf.
// ============================================================
export async function POST(request: Request) {
  try {
    const ctx = await requireRole("admin");

    const limit = checkRateLimit(
      `admin:memberCreate:${ctx.userId}`,
      RATE_LIMITS.adminAction,
    );
    if (!limit.success) return rateLimitResponse(limit);

    const body = (await request.json().catch(() => null)) as {
      email?: unknown;
      role?: unknown;
      fullName?: unknown;
      password?: unknown;
    } | null;

    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : null;
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
    }

    const role = body?.role;
    // 'owner' is excluded deliberately: there is exactly one owner
    // per account and it changes only via transfer-ownership.
    if (!isAccountRole(role) || role === "owner") {
      return NextResponse.json(
        { error: "'role' must be one of admin, agent, viewer" },
        { status: 400 },
      );
    }

    let fullName = "";
    if (typeof body?.fullName === "string") {
      fullName = body.fullName.trim().slice(0, MAX_FULL_NAME_LEN);
    }

    // An admin may supply a password; otherwise we generate one.
    let password: string;
    if (typeof body?.password === "string" && body.password !== "") {
      if (body.password.length < MIN_MEMBER_PASSWORD) {
        return NextResponse.json(
          { error: `Password must be at least ${MIN_MEMBER_PASSWORD} characters` },
          { status: 400 },
        );
      }
      password = body.password;
    } else {
      password = generateTempPassword();
    }

    const admin = supabaseAdmin();

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: fullName ? { full_name: fullName } : undefined,
    });

    if (createErr || !created?.user) {
      const message = createErr?.message ?? "Failed to create the user";
      // Supabase reports an existing address as 422
      // "already been registered". That person already has a login,
      // so the invite-link flow is the right tool for them.
      if (/already|exist|registered/i.test(message)) {
        return NextResponse.json(
          {
            error:
              "That email already has a login. Send them an invite link instead — they can sign in and accept it.",
          },
          { status: 409 },
        );
      }
      console.error("[POST /api/account/members] createUser failed:", message);
      return NextResponse.json({ error: message }, { status: 500 });
    }

    const newUserId = created.user.id;

    // Where did the signup trigger put them? We need it to clean up.
    const { data: seeded } = await admin
      .from("profiles")
      .select("account_id")
      .eq("user_id", newUserId)
      .maybeSingle();
    const personalAccountId = (seeded?.account_id as string | null) ?? null;

    // `handle_new_user` swallows its own failures as a WARNING, so the
    // profile row may be missing entirely. Upsert covers both paths:
    // re-point an existing row, or create the one the trigger didn't.
    const { error: attachErr } = await admin.from("profiles").upsert(
      {
        user_id: newUserId,
        full_name: fullName,
        email,
        account_id: ctx.accountId,
        account_role: role,
      },
      { onConflict: "user_id" },
    );

    if (attachErr) {
      // Roll the login back — a login that belongs to no account is
      // worse than no login, since the admin can't retry the same
      // email (it would come back as "already registered").
      await admin.auth.admin.deleteUser(newUserId).catch(() => {});
      console.error("[POST /api/account/members] attach failed:", attachErr);
      return NextResponse.json(
        { error: "Created the login but could not add them to the account" },
        { status: 500 },
      );
    }

    // Drop the personal account the trigger made. Safe now: the
    // profile above no longer points at it and it holds no data.
    // Best-effort — an orphan account is invisible to everyone.
    if (personalAccountId && personalAccountId !== ctx.accountId) {
      const { error: cleanupErr } = await admin
        .from("accounts")
        .delete()
        .eq("id", personalAccountId)
        .eq("owner_user_id", newUserId);
      if (cleanupErr) {
        console.warn(
          "[POST /api/account/members] orphan account cleanup failed:",
          cleanupErr.message,
        );
      }
    }

    return NextResponse.json(
      {
        member: {
          user_id: newUserId,
          full_name: fullName,
          email,
          avatar_url: null,
          role,
          joined_at: new Date().toISOString(),
        } satisfies AccountMember,
        // Shown to the admin once, then gone.
        password,
      },
      { status: 201 },
    );
  } catch (err) {
    return toErrorResponse(err);
  }
}
