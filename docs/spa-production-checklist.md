# Haus of Spa — Production Launch Checklist

Use when onboarding a live spa / wellness tenant.

## 1. Organization setup

- [ ] Set `business_type = spa` on organization record
- [ ] Confirm plan tier (`professional` minimum for POS, clinical, therapy notes, resource booking)
- [ ] Enable feature overrides if needed: `bookings`, `crm`, `loyalty`, `marketing`, `inventory_tracking`, `pos_payments`, `clinical`, `therapy_notes`, `resource_booking`

## 2. Treatment catalog

- [ ] Import or create spa services with categories (`swedish`, `hot_stone`, `couples_package`, etc.)
- [ ] Set `prep_minutes` / `buffer_minutes` per category (hot stone: 15+10; body wrap: 10+15; steam: 0+10)
- [ ] Flag couples packages and set room capacity requirements

## 3. Therapists

- [ ] Create therapist profiles with specialties matching service categories
- [ ] Link user accounts for portal / QR clock if used
- [ ] Configure commission rates if `staff_commissions_payroll` enabled

## 4. Treatment rooms & resources

- [ ] Enable `resource_booking` feature
- [ ] Create rooms, beds, sauna/steam facilities with correct capacity
- [ ] Couple Suite capacity ≥ 2 for couples massage bookings

## 5. Guest safety & consent

- [ ] Create consent templates: Massage Consent, Contra-indication Declaration, Pregnancy Massage Consent
- [ ] Enable `clinical` for consent workflows
- [ ] Capture allergy flags on guest profiles (`has_allergies`, `allergy_notes`) — essential oil sensitivities

## 6. Session notes & progress

- [ ] Enable `therapy_notes` feature
- [ ] Train therapists to record session notes after treatments
- [ ] Use Progress Tracking for guest wellness journey review

## 7. Payments & deposits

- [ ] Configure Pesapal credentials (collect)
- [ ] Set booking deposit policy for premium packages if needed (`booking_deposits`)
- [ ] Verify OpenFloat payout config if disbursing commissions

## 8. Communications

- [ ] Configure SMS/WhatsApp reminder templates (`sms_reminders`)
- [ ] Test session confirmation + reminder delivery

## 9. Public booking

- [ ] Verify public URL: `/book/{org-slug}`
- [ ] Confirm `theme-spa` + Haus of Spa branding
- [ ] Smoke-test: treatment pick → therapist → room (if enabled) → confirm

## 10. Go-live verification (manual)

- [ ] Walk-in queue → session → POS checkout
- [ ] Allergy guest shows alert on session card
- [ ] Room double-book blocked for overlapping times
- [ ] Session note saved after treatment complete
