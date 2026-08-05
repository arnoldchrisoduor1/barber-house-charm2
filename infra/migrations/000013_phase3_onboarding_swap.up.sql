-- Phase 3 B3-04 onboarding checklist + B3-05 shift swap.

CREATE TABLE IF NOT EXISTS onboarding_checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_onboarding_templates_org ON onboarding_checklist_templates(organization_id, sort_order);

CREATE TABLE IF NOT EXISTS onboarding_checklist_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES onboarding_checklist_templates(id) ON DELETE CASCADE,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, template_id)
);
CREATE INDEX IF NOT EXISTS idx_onboarding_completions_staff ON onboarding_checklist_completions(organization_id, staff_id);

CREATE TABLE IF NOT EXISTS shift_swap_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  from_staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  to_staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  schedule_date date NOT NULL,
  shift_label text,
  from_schedule_id uuid REFERENCES staff_schedules(id) ON DELETE SET NULL,
  to_schedule_id uuid REFERENCES staff_schedules(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  reviewed_by_user_id uuid,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (from_staff_id <> to_staff_id)
);
CREATE INDEX IF NOT EXISTS idx_shift_swap_org_date ON shift_swap_requests(organization_id, schedule_date);
