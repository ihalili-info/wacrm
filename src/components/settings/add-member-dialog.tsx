'use client';

// ============================================================
// AddMemberDialog
//
// Creates the teammate's LOGIN and adds them to the account in one
// step, for deployments where Supabase self-service signup is off.
// An invite link can only grant a role to a login that already
// exists, so without this an invited person has no way in.
//
// Two-step modal, mirroring InviteMemberDialog:
//   1. Form   — name + email + role (+ optional password).
//   2. Result — the email and password, shown ONCE, with copy and a
//               "Send via WhatsApp" hand-off. The password is stored
//               only as a hash in Supabase Auth, so once this step is
//               dismissed it can be reset but never re-read.
//
// Copy is hardcoded English (same as src/app/join/[token]/page.tsx)
// rather than routed through next-intl, to avoid shipping guessed
// Korean strings — messages/*.json parity is asserted by a test.
// ============================================================

import { useState } from 'react';
import { toast } from 'sonner';
import { Copy, Loader2, MessageCircle, UserPlus } from 'lucide-react';

import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/use-auth';

type MemberRole = 'admin' | 'agent' | 'viewer';

/** Mirrors MIN_MEMBER_PASSWORD on the server so an obviously-short
 *  password bounces before the round-trip. */
const MIN_PASSWORD = 10;
const MAX_FULL_NAME_LEN = 120;

interface CreatedMember {
  email: string;
  password: string;
  role: MemberRole;
  fullName: string;
  /** Snapshotted at creation so a later rename can't change the
   *  wa.me text on the result step. */
  accountName: string;
}

export function AddMemberDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful create so the parent re-fetches the roster. */
  onCreated: () => void;
}) {
  const tRoles = useTranslations('Settings.roles');
  const { account } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRole>('agent');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CreatedMember | null>(null);

  function reset() {
    setFullName('');
    setEmail('');
    setRole('agent');
    setPassword('');
    setResult(null);
    setSubmitting(false);
  }

  async function handleCreate() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      toast.error('Enter the teammate’s email address');
      return;
    }
    if (password !== '' && password.length < MIN_PASSWORD) {
      toast.error(`Password must be at least ${MIN_PASSWORD} characters`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/account/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          role,
          fullName: fullName.trim() || undefined,
          password: password || undefined,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(payload.error || 'Failed to create the member');
        return;
      }

      setResult({
        email: payload.member?.email ?? trimmedEmail,
        password: payload.password,
        role,
        fullName: payload.member?.full_name ?? fullName.trim(),
        accountName: account?.name ?? 'Balkania WA CRM',
      });
      onCreated();
    } catch {
      toast.error('Network error — please try again');
    } finally {
      setSubmitting(false);
    }
  }

  async function copyCredentials() {
    if (!result) return;
    const text = `Balkania WA CRM sign-in\nEmail: ${result.email}\nPassword: ${result.password}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Credentials copied');
    } catch {
      // Usually "not in a secure context" (plain-http local IP).
      toast.error('Clipboard blocked — select the fields and copy manually');
    }
  }

  function whatsappShareUrl(): string {
    if (!result) return 'https://wa.me/';
    const message =
      `You've been added to ${result.accountName}.\n\n` +
      `Sign in at ${window.location.origin}/login\n` +
      `Email: ${result.email}\n` +
      `Temporary password: ${result.password}\n\n` +
      `Please change your password after your first sign-in ` +
      `(Settings → Login & security).`;
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Reset on close, for cancel and for post-create dismissal
        // alike. The plaintext password is deliberately NOT kept
        // across opens — it is unrecoverable once gone.
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="border-border bg-popover sm:max-w-md">
        {result ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-popover-foreground">
                <UserPlus className="size-4 text-primary" />
                Member added
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {result.fullName || result.email} can sign in now as{' '}
                <strong>{tRoles(result.role)}</strong>. Send them these
                credentials.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Email</Label>
                <Input
                  readOnly
                  value={result.email}
                  className="border-border bg-muted font-mono text-xs text-foreground"
                  onFocus={(e) => e.currentTarget.select()}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-muted-foreground">
                  Temporary password
                </Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={result.password}
                    className="border-border bg-muted font-mono text-xs text-foreground"
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <Button
                    type="button"
                    onClick={copyCredentials}
                    className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Copy className="size-4" />
                    Copy
                  </Button>
                </div>
              </div>

              <div className="rounded-md border border-amber-500/50 bg-amber-500/15 px-3 py-2 text-xs text-amber-200">
                <strong className="font-semibold text-amber-100">
                  Copy this password now.
                </strong>{' '}
                It is stored only as a hash and cannot be shown again — you
                can reset it, but not read it. Ask them to change it after
                their first sign-in.
              </div>

              <a
                href={whatsappShareUrl()}
                target="_blank"
                rel="noreferrer noopener"
                className={buttonVariants({
                  variant: 'outline',
                  className:
                    'w-full border-border text-muted-foreground hover:bg-muted hover:text-foreground',
                })}
              >
                <MessageCircle className="size-4" />
                Send via WhatsApp
              </a>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-popover-foreground">
                <UserPlus className="size-4 text-primary" />
                Add member
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Creates their sign-in and adds them to this account. You hand
                the password over yourself — no email is sent.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="member-name" className="text-muted-foreground">
                  Full name
                </Label>
                <Input
                  id="member-name"
                  value={fullName}
                  maxLength={MAX_FULL_NAME_LEN}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                  className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="member-email" className="text-muted-foreground">
                  Email
                </Label>
                <Input
                  id="member-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@balkania.ie"
                  className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Role</Label>
                <Select
                  value={role}
                  onValueChange={(v) => setRole(v as MemberRole)}
                >
                  <SelectTrigger className="border-border bg-muted text-foreground">
                    <SelectValue>{tRoles(role)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(['admin', 'agent', 'viewer'] as const).map((r) => (
                      <SelectItem key={r} value={r}>
                        <span className="font-medium">{tRoles(r)}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {tRoles(`${r}Hint`)}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="member-password"
                  className="text-muted-foreground"
                >
                  Password{' '}
                  <span className="font-normal text-muted-foreground">
                    — leave blank to generate one
                  </span>
                </Label>
                <Input
                  id="member-password"
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={`At least ${MIN_PASSWORD} characters`}
                  className="border-border bg-muted font-mono text-foreground placeholder:font-sans placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
                className="border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleCreate}
                disabled={submitting}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {submitting && <Loader2 className="size-4 animate-spin" />}
                {submitting ? 'Creating…' : 'Create member'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
