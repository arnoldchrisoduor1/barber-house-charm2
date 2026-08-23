CREATE TABLE IF NOT EXISTS patient_intake (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
    medical_history TEXT NOT NULL DEFAULT '',
    allergies TEXT NOT NULL DEFAULT '',
    medications TEXT NOT NULL DEFAULT '',
    emergency_contact_name TEXT NOT NULL DEFAULT '',
    emergency_contact_phone TEXT NOT NULL DEFAULT '',
    consent_given BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_intake_org ON patient_intake (organization_id);
CREATE INDEX IF NOT EXISTS idx_patient_intake_customer ON patient_intake (organization_id, customer_id);

CREATE TABLE IF NOT EXISTS aftercare_instructions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    procedure_name TEXT NOT NULL DEFAULT '',
    booking_id UUID REFERENCES bookings (id) ON DELETE SET NULL,
    follow_up_at DATE,
    is_template BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aftercare_instructions_org ON aftercare_instructions (organization_id);

CREATE TABLE IF NOT EXISTS progress_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
    metric_name TEXT NOT NULL,
    metric_value TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_progress_tracking_org ON progress_tracking (organization_id);
CREATE INDEX IF NOT EXISTS idx_progress_tracking_customer ON progress_tracking (organization_id, customer_id);
