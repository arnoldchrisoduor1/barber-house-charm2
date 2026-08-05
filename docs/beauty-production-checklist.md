# Haus of Beauty — Production Launch Checklist

Use when onboarding a live beauty tenant (salon / spa-adjacent).

## 1. Organization setup

- [ ] Set `business_type = beauty` on organization record
- [ ] Confirm plan tier (`professional` minimum for POS, clinical, consultation history)
- [ ] Enable feature overrides if needed: `bookings`, `crm`, `loyalty`, `marketing`, `inventory_tracking`, `pos_payments`, `clinical`, `consultation_history`

## 2. Service catalog

- [ ] Import or create beauty services with categories (`braids`, `facial`, `colour`, etc.)
- [ ] Set `prep_minutes` / `buffer_minutes` per category (colour/keratin: 15 prep + 10 buffer; facial: 5+10; waxing: 0+5)
- [ ] Flag chemical services with `requires_patch_test = true` (hair colour, relaxer, etc.)

## 3. Staff

- [ ] Create stylist profiles with specialties matching service categories
- [ ] Link user accounts for portal / QR clock if used
- [ ] Configure commission rates if `staff_commissions_payroll` enabled

## 4. Compliance & client safety

- [ ] Create consent form templates: Chemical Treatment, Waxing/Facial, Allergy & Patch Test Declaration
- [ ] Enable `clinical` feature for consent + patch test workflows
- [ ] Train staff to record patch tests before chemical bookings
- [ ] Capture allergy flags on client profiles (`has_allergies`, `allergy_notes`)

## 5. Payments & deposits

- [ ] Configure Pesapal credentials (collect)
- [ ] Set booking deposit / cancellation policy if taking pre-auth for chemical treatments (`booking_deposits`)
- [ ] Verify OpenFloat payout config if disbursing commissions

## 6. Communications

- [ ] Configure SMS/WhatsApp reminder templates (`sms_reminders`)
- [ ] Test appointment confirmation + reminder delivery

## 7. Public booking

- [ ] Verify public URL: `/book/{org-slug}`
- [ ] Confirm `theme-beauty` + Haus of Beauty branding
- [ ] Smoke-test: service pick → stylist → confirm

## 8. Go-live verification (manual)

- [ ] Walk-in queue → appointment → POS checkout
- [ ] Allergy client shows alert on appointment card
- [ ] Patch test warning on chemical service booking (warn only)
- [ ] Consultation note after completed appointment
