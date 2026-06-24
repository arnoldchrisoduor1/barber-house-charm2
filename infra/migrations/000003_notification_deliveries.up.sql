CREATE TYPE notification_channel AS ENUM ('sms', 'whatsapp', 'email');
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed');

CREATE TABLE IF NOT EXISTS notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  recipient_phone text NOT NULL,
  channel notification_channel NOT NULL,
  template_key text NOT NULL,
  body text,
  status notification_status NOT NULL DEFAULT 'pending',
  booking_id uuid REFERENCES bookings(id),
  external_ref text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_org ON notification_deliveries(organization_id);
