CREATE TYPE resource_type AS ENUM ('room', 'bed', 'equipment', 'facility');
CREATE TYPE resource_status AS ENUM ('available', 'occupied', 'maintenance', 'cleaning');

CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    resource_type resource_type NOT NULL DEFAULT 'room',
    capacity INT NOT NULL DEFAULT 1,
    status resource_status NOT NULL DEFAULT 'available',
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_resources_org ON resources (organization_id);
CREATE INDEX idx_resources_org_branch ON resources (organization_id, branch_id);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS resource_id UUID REFERENCES resources(id) ON DELETE SET NULL;
CREATE INDEX idx_bookings_resource ON bookings (organization_id, resource_id, booking_date);

CREATE TABLE session_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    session_date DATE NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    focus_area TEXT NOT NULL DEFAULT '',
    pressure_level TEXT NOT NULL DEFAULT '',
    oils_used TEXT NOT NULL DEFAULT '',
    contraindications TEXT NOT NULL DEFAULT '',
    next_visit_notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_session_notes_org ON session_notes (organization_id);
CREATE INDEX idx_session_notes_customer ON session_notes (organization_id, customer_id);
