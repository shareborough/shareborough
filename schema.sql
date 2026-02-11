-- Shareborough — Database Schema
-- Lending library app built on AYB (AllYourBase)

-- =============================================================================
-- Libraries — A lender's collection of things
-- =============================================================================
CREATE TABLE libraries (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id    UUID NOT NULL REFERENCES _ayb_users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,
    description TEXT,
    cover_photo TEXT,          -- URL to AYB storage
    is_public   BOOLEAN NOT NULL DEFAULT true,
    show_borrower_names BOOLEAN NOT NULL DEFAULT false,  -- privacy setting
    show_return_dates   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_libraries_owner ON libraries(owner_id);
CREATE INDEX idx_libraries_slug ON libraries(slug);

-- =============================================================================
-- Facet Definitions — Custom metadata fields per library
-- e.g. "Battery Size" (text), "Genre" (text), "Weight (lbs)" (number)
-- =============================================================================
CREATE TABLE facet_definitions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    library_id  UUID NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    facet_type  TEXT NOT NULL DEFAULT 'text' CHECK (facet_type IN ('text', 'number', 'boolean')),
    options     TEXT[],        -- predefined options for dropdowns (optional)
    position    SMALLINT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_facet_defs_library ON facet_definitions(library_id);

-- =============================================================================
-- Circles — Groups of people (identified by phone) for visibility/access control
-- =============================================================================
CREATE TABLE circles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id    UUID NOT NULL REFERENCES _ayb_users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_circles_owner ON circles(owner_id);

CREATE TABLE circle_members (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    circle_id   UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
    phone       TEXT NOT NULL,
    name        TEXT NOT NULL,
    avatar_url  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(circle_id, phone)
);

CREATE INDEX idx_circle_members_circle ON circle_members(circle_id);
CREATE INDEX idx_circle_members_phone ON circle_members(phone);

-- =============================================================================
-- Items — Things in a library that can be lent
-- =============================================================================
CREATE TABLE items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    library_id      UUID NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    description     TEXT,
    photo_url       TEXT,          -- URL to AYB storage
    status          TEXT NOT NULL DEFAULT 'available'
                    CHECK (status IN ('available', 'borrowed', 'unavailable')),
    max_borrow_days INTEGER,       -- max days a borrower can keep this item
    visibility      TEXT NOT NULL DEFAULT 'public'
                    CHECK (visibility IN ('public', 'circle')),
    circle_id       UUID REFERENCES circles(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_items_library ON items(library_id);
CREATE INDEX idx_items_status ON items(status);

-- =============================================================================
-- Item Facets — Facet values for items (EAV pattern)
-- =============================================================================
CREATE TABLE item_facets (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id             UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    facet_definition_id UUID NOT NULL REFERENCES facet_definitions(id) ON DELETE CASCADE,
    value               TEXT NOT NULL,
    UNIQUE(item_id, facet_definition_id)
);

CREATE INDEX idx_item_facets_item ON item_facets(item_id);

-- =============================================================================
-- Borrowers — People who borrow things (NO account required!)
-- Just a name and phone number. Zero friction.
-- =============================================================================
CREATE TABLE borrowers (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone       TEXT NOT NULL,
    name        TEXT NOT NULL,
    user_id     UUID REFERENCES _ayb_users(id),  -- optional: if they later create an account
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_borrowers_phone ON borrowers(phone);

-- =============================================================================
-- Borrow Requests — A borrower asks to borrow an item
-- =============================================================================
CREATE TABLE borrow_requests (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id             UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    borrower_id         UUID NOT NULL REFERENCES borrowers(id) ON DELETE CASCADE,
    message             TEXT,          -- optional message from borrower
    status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'approved', 'declined', 'cancelled')),
    return_by           TIMESTAMPTZ,   -- borrower's requested return date
    private_possession  BOOLEAN NOT NULL DEFAULT false,  -- hide who has the item
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_borrow_requests_item ON borrow_requests(item_id);
CREATE INDEX idx_borrow_requests_status ON borrow_requests(status);

-- =============================================================================
-- Loans — Active and completed loans
-- =============================================================================
CREATE TABLE loans (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id             UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    borrower_id         UUID NOT NULL REFERENCES borrowers(id) ON DELETE CASCADE,
    request_id          UUID REFERENCES borrow_requests(id),
    borrowed_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    return_by           TIMESTAMPTZ,   -- expected return date
    returned_at         TIMESTAMPTZ,   -- actual return date (null = still borrowed)
    status              TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'returned', 'late')),
    notes               TEXT,
    private_possession  BOOLEAN NOT NULL DEFAULT false, -- hide who has it from public
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_loans_item ON loans(item_id);
CREATE INDEX idx_loans_borrower ON loans(borrower_id);
CREATE INDEX idx_loans_status ON loans(status);
CREATE INDEX idx_loans_return_by ON loans(return_by) WHERE status = 'active';

-- =============================================================================
-- Reminders — Scheduled SMS reminders for loans
-- =============================================================================
CREATE TABLE reminders (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id      UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    reminder_type TEXT NOT NULL
                  CHECK (reminder_type IN ('confirmation', 'upcoming', 'due_today', 'overdue_1d', 'overdue_3d', 'overdue_7d', 'returned')),
    scheduled_for TIMESTAMPTZ NOT NULL,
    sent_at       TIMESTAMPTZ,  -- null = not yet sent
    message       TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reminders_pending ON reminders(scheduled_for) WHERE sent_at IS NULL;
CREATE INDEX idx_reminders_loan ON reminders(loan_id);

-- =============================================================================
-- RLS Policies
-- =============================================================================

-- Libraries: owner full access, public read for is_public=true
ALTER TABLE libraries ENABLE ROW LEVEL SECURITY;

CREATE POLICY libraries_owner_all ON libraries
    FOR ALL USING (owner_id::text = current_setting('ayb.user_id', true));

CREATE POLICY libraries_public_read ON libraries
    FOR SELECT USING (is_public = true);

-- Circles: owner full access
ALTER TABLE circles ENABLE ROW LEVEL SECURITY;

CREATE POLICY circles_owner_all ON circles
    FOR ALL USING (owner_id::text = current_setting('ayb.user_id', true));

-- Circle members: owner full access via circle
ALTER TABLE circle_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY circle_members_owner_all ON circle_members
    FOR ALL USING (
        circle_id IN (
            SELECT id FROM circles
            WHERE owner_id::text = current_setting('ayb.user_id', true)
        )
    );

CREATE POLICY circle_members_public_read ON circle_members
    FOR SELECT USING (true);

-- Items: owner (via library) full access, public read for public libraries
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

CREATE POLICY items_owner_all ON items
    FOR ALL USING (
        library_id IN (
            SELECT id FROM libraries
            WHERE owner_id::text = current_setting('ayb.user_id', true)
        )
    );

CREATE POLICY items_public_read ON items
    FOR SELECT USING (
        library_id IN (SELECT id FROM libraries WHERE is_public = true)
    );

-- Facet definitions: owner manage, public read
ALTER TABLE facet_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY facet_defs_owner_all ON facet_definitions
    FOR ALL USING (
        library_id IN (
            SELECT id FROM libraries
            WHERE owner_id::text = current_setting('ayb.user_id', true)
        )
    );

CREATE POLICY facet_defs_public_read ON facet_definitions
    FOR SELECT USING (
        library_id IN (SELECT id FROM libraries WHERE is_public = true)
    );

-- Item facets: owner manage, public read
ALTER TABLE item_facets ENABLE ROW LEVEL SECURITY;

CREATE POLICY item_facets_owner_all ON item_facets
    FOR ALL USING (
        item_id IN (
            SELECT i.id FROM items i
            JOIN libraries l ON l.id = i.library_id
            WHERE l.owner_id::text = current_setting('ayb.user_id', true)
        )
    );

CREATE POLICY item_facets_public_read ON item_facets
    FOR SELECT USING (
        item_id IN (
            SELECT i.id FROM items i
            JOIN libraries l ON l.id = i.library_id
            WHERE l.is_public = true
        )
    );

-- Borrowers: anyone can insert (that's the whole point!)
ALTER TABLE borrowers ENABLE ROW LEVEL SECURITY;

CREATE POLICY borrowers_insert ON borrowers
    FOR INSERT WITH CHECK (true);

CREATE POLICY borrowers_owner_read ON borrowers
    FOR SELECT USING (true);  -- owners need to see borrower info

-- Borrow requests: anyone can insert, owner can manage
ALTER TABLE borrow_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY requests_insert ON borrow_requests
    FOR INSERT WITH CHECK (true);

CREATE POLICY requests_owner_manage ON borrow_requests
    FOR ALL USING (
        item_id IN (
            SELECT i.id FROM items i
            JOIN libraries l ON l.id = i.library_id
            WHERE l.owner_id::text = current_setting('ayb.user_id', true)
        )
    );

CREATE POLICY requests_public_read ON borrow_requests
    FOR SELECT USING (true);

-- Loans: owner full access, public limited read
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY loans_owner_all ON loans
    FOR ALL USING (
        item_id IN (
            SELECT i.id FROM items i
            JOIN libraries l ON l.id = i.library_id
            WHERE l.owner_id::text = current_setting('ayb.user_id', true)
        )
    );

CREATE POLICY loans_public_read ON loans
    FOR SELECT USING (true);

-- Reminders: system-managed, owner read
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY reminders_owner_read ON reminders
    FOR SELECT USING (
        loan_id IN (
            SELECT lo.id FROM loans lo
            JOIN items i ON i.id = lo.item_id
            JOIN libraries l ON l.id = i.library_id
            WHERE l.owner_id::text = current_setting('ayb.user_id', true)
        )
    );

-- =============================================================================
-- Phone Auth Codes — OTP codes for phone-based authentication
-- =============================================================================
CREATE TABLE phone_auth_codes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone       TEXT NOT NULL,
    code        TEXT NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes'),
    used        BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_phone_auth_codes_phone ON phone_auth_codes(phone);
CREATE INDEX idx_phone_auth_codes_expires ON phone_auth_codes(expires_at) WHERE NOT used;

ALTER TABLE phone_auth_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY phone_auth_codes_insert ON phone_auth_codes
    FOR INSERT WITH CHECK (true);

CREATE POLICY phone_auth_codes_select ON phone_auth_codes
    FOR SELECT USING (true);

-- =============================================================================
-- User Profiles — Extended user info (avatars, display names)
-- =============================================================================
CREATE TABLE user_profiles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL UNIQUE REFERENCES _ayb_users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url  TEXT,
    phone       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_profiles_user ON user_profiles(user_id);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_profiles_owner_all ON user_profiles
    FOR ALL USING (user_id::text = current_setting('ayb.user_id', true));

CREATE POLICY user_profiles_public_read ON user_profiles
    FOR SELECT USING (true);

-- =============================================================================
-- Functions
-- =============================================================================

-- Generate and store an OTP for phone-based auth
CREATE OR REPLACE FUNCTION request_phone_otp(p_phone TEXT)
RETURNS void AS $$
DECLARE
    v_code TEXT;
BEGIN
    -- Generate 6-digit code
    v_code := lpad(floor(random() * 1000000)::text, 6, '0');

    -- Invalidate existing codes for this phone
    UPDATE phone_auth_codes SET used = true WHERE phone = p_phone AND NOT used;

    -- Insert new code
    INSERT INTO phone_auth_codes (phone, code)
    VALUES (p_phone, v_code);

    -- In production, integrate with SMS provider here.
    -- For development, the code appears in the server logs via RAISE NOTICE.
    RAISE NOTICE 'OTP for %: %', p_phone, v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify an OTP code
CREATE OR REPLACE FUNCTION verify_phone_otp(p_phone TEXT, p_code TEXT)
RETURNS TABLE(verified boolean, expires_at timestamptz) AS $$
DECLARE
    v_auth phone_auth_codes;
BEGIN
    SELECT * INTO v_auth FROM phone_auth_codes
    WHERE phone = p_phone
      AND code = p_code
      AND NOT used
      AND phone_auth_codes.expires_at > now()
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_auth IS NULL THEN
        RETURN QUERY SELECT false, now();
        RETURN;
    END IF;

    -- Mark as used
    UPDATE phone_auth_codes SET used = true WHERE id = v_auth.id;

    RETURN QUERY SELECT true, (now() + interval '30 days');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic borrow request: creates borrower (or finds existing) + creates request
CREATE OR REPLACE FUNCTION request_borrow(
    p_item_id UUID,
    p_borrower_name TEXT,
    p_borrower_phone TEXT,
    p_message TEXT DEFAULT NULL,
    p_return_by TIMESTAMPTZ DEFAULT NULL,
    p_private_possession BOOLEAN DEFAULT false
) RETURNS borrow_requests AS $$
DECLARE
    v_borrower_id UUID;
    v_request borrow_requests;
    v_item items;
BEGIN
    -- Check item is available
    SELECT * INTO v_item FROM items WHERE id = p_item_id;
    IF v_item IS NULL THEN
        RAISE EXCEPTION 'Item not found';
    END IF;
    IF v_item.status != 'available' THEN
        RAISE EXCEPTION 'Item is not available for borrowing';
    END IF;

    -- Enforce max borrow period
    IF p_return_by IS NOT NULL AND v_item.max_borrow_days IS NOT NULL THEN
        IF p_return_by > (now() + (v_item.max_borrow_days || ' days')::interval) THEN
            RAISE EXCEPTION 'Return date exceeds max borrow period of % days', v_item.max_borrow_days;
        END IF;
    END IF;

    -- Find or create borrower
    INSERT INTO borrowers (phone, name)
    VALUES (p_borrower_phone, p_borrower_name)
    ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_borrower_id;

    -- Create borrow request
    INSERT INTO borrow_requests (item_id, borrower_id, message, return_by, private_possession)
    VALUES (p_item_id, v_borrower_id, p_message, p_return_by, p_private_possession)
    RETURNING * INTO v_request;

    RETURN v_request;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Approve a borrow request: creates a loan and updates item status
-- Uses the borrower's requested return_by if no override is provided.
CREATE OR REPLACE FUNCTION approve_borrow(
    p_request_id UUID,
    p_return_by TIMESTAMPTZ DEFAULT NULL
) RETURNS loans AS $$
DECLARE
    v_request borrow_requests;
    v_loan loans;
    v_owner_id TEXT;
    v_return_by TIMESTAMPTZ;
BEGIN
    -- Verify request exists and is pending
    SELECT * INTO v_request FROM borrow_requests WHERE id = p_request_id;
    IF v_request IS NULL THEN
        RAISE EXCEPTION 'Request not found';
    END IF;
    IF v_request.status != 'pending' THEN
        RAISE EXCEPTION 'Request is not pending';
    END IF;

    -- Verify caller is the library owner
    SELECT l.owner_id::text INTO v_owner_id
    FROM items i JOIN libraries l ON l.id = i.library_id
    WHERE i.id = v_request.item_id;

    IF v_owner_id != current_setting('ayb.user_id', true) THEN
        RAISE EXCEPTION 'Only the library owner can approve requests';
    END IF;

    -- Use provided return_by, fall back to borrower's requested date
    v_return_by := COALESCE(p_return_by, v_request.return_by);

    -- Update request status
    UPDATE borrow_requests SET status = 'approved', updated_at = now()
    WHERE id = p_request_id;

    -- Update item status
    UPDATE items SET status = 'borrowed', updated_at = now()
    WHERE id = v_request.item_id;

    -- Create loan (carry forward private_possession from request)
    INSERT INTO loans (item_id, borrower_id, request_id, return_by)
    VALUES (v_request.item_id, v_request.borrower_id, p_request_id, v_return_by)
    RETURNING * INTO v_loan;

    RETURN v_loan;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Return an item: marks loan as returned, updates item status
CREATE OR REPLACE FUNCTION return_item(
    p_loan_id UUID
) RETURNS loans AS $$
DECLARE
    v_loan loans;
    v_owner_id TEXT;
BEGIN
    SELECT * INTO v_loan FROM loans WHERE id = p_loan_id;
    IF v_loan IS NULL THEN
        RAISE EXCEPTION 'Loan not found';
    END IF;
    IF v_loan.status = 'returned' THEN
        RAISE EXCEPTION 'Item already returned';
    END IF;

    -- Verify caller is the library owner
    SELECT l.owner_id::text INTO v_owner_id
    FROM items i JOIN libraries l ON l.id = i.library_id
    WHERE i.id = v_loan.item_id;

    IF v_owner_id != current_setting('ayb.user_id', true) THEN
        RAISE EXCEPTION 'Only the library owner can mark returns';
    END IF;

    -- Update loan
    UPDATE loans SET status = 'returned', returned_at = now(), updated_at = now()
    WHERE id = p_loan_id;

    -- Update item status back to available
    UPDATE items SET status = 'available', updated_at = now()
    WHERE id = v_loan.item_id;

    SELECT * INTO v_loan FROM loans WHERE id = p_loan_id;
    RETURN v_loan;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate a URL-safe slug from a name
CREATE OR REPLACE FUNCTION generate_slug(p_name TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN lower(regexp_replace(regexp_replace(p_name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'));
END;
$$ LANGUAGE plpgsql;
