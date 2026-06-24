-- Inventory, loyalty, reviews, notifications, coverage zones, audit, staff schedules, waitlist
CREATE TABLE IF NOT EXISTS inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id),
  name text NOT NULL,
  category text,
  quantity integer NOT NULL DEFAULT 0,
  unit text,
  unit_cost_kes integer NOT NULL DEFAULT 0,
  reorder_level integer NOT NULL DEFAULT 0,
  supplier text,
  last_restocked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inventory_org ON inventory(organization_id);

CREATE TABLE IF NOT EXISTS loyalty_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  points_required integer NOT NULL DEFAULT 0,
  reward_type text,
  reward_value numeric,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id),
  staff_id uuid REFERENCES staff(id),
  booking_id uuid REFERENCES bookings(id),
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  referrer_customer_id uuid NOT NULL REFERENCES customers(id),
  referred_customer_id uuid REFERENCES customers(id),
  referral_code text NOT NULL,
  reward_kes integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS staff_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES staff(id),
  branch_id uuid REFERENCES branches(id),
  schedule_date date NOT NULL,
  start_time time NOT NULL DEFAULT '08:00',
  end_time time NOT NULL DEFAULT '20:00',
  is_day_off boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id),
  name text NOT NULL,
  category text,
  price_kes integer NOT NULL DEFAULT 0,
  duration_minutes integer NOT NULL DEFAULT 30,
  description text,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id),
  service_id uuid REFERENCES services(id),
  preferred_staff_id uuid REFERENCES staff(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS coverage_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  city text,
  center_lat double precision,
  center_lng double precision,
  radius_km double precision,
  area_polygon jsonb,
  surcharge_kes integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id),
  user_id uuid REFERENCES users(id),
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id),
  title text NOT NULL,
  body text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES staff(id),
  customer_id uuid REFERENCES customers(id),
  booking_id uuid REFERENCES bookings(id),
  amount_kes integer NOT NULL,
  payment_method text,
  tip_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS qr_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES staff(id),
  scan_type text NOT NULL,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  geo_lat double precision,
  geo_lng double precision,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
