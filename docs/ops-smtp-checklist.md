# Production SMTP checklist (Haus of Barber / all modes)

Staff invites, email verify, and 2FA codes need real delivery in production.
Local/dev defaults may log email only — the invite UI must not claim “sent” unless SMTP delivers externally.

## Required env (API)

| Variable | Prod value |
|----------|------------|
| `SMTP_HOST` | Provider host (not `mailhog`) |
| `SMTP_PORT` | Usually `587` |
| `SMTP_USER` / `SMTP_PASSWORD` | Provider credentials |
| `SMTP_USE_STARTTLS` | `true` for 587 |
| `SMTP_FROM` or `EMAIL_FROM_ADDRESS` | Verified from address |
| `EMAIL_FROM_NAME` | e.g. `Haus of Wellness` |
| `EMAIL_DRY_RUN` | **`false`** |
| `PUBLIC_WEB_URL` | Public https origin (invite + verify links) |

Compose reference: [`infra/docker/compose.yml`](../infra/docker/compose.yml) (MailHog for local).

## Behaviour

- `EMAIL_DRY_RUN=true` **or** empty `SMTP_HOST` → `LogSender` → invite API returns `email_delivered: false`.
- Real SMTP → `email_delivered: true`.
- Staff UI toast reflects `email_delivered` (does not fake delivery).

## Verify before pilot

1. Set prod SMTP env; restart API.
2. Invite a real mailbox; receive email; accept-invite link works.
3. Request 2FA / verify-email; message arrives.
4. Confirm `audit_log` contains `staff.invite` after invite.
