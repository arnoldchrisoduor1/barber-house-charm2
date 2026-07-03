DELETE FROM audit_log WHERE organization_id = '945c14f2-7837-4484-99e4-8c08d746e5bb';
INSERT INTO audit_log (organization_id, action, entity_type, metadata) VALUES
('945c14f2-7837-4484-99e4-8c08d746e5bb', 'staff.clock_in', 'attendance', '{"staff":"Alex Barber"}'),
('945c14f2-7837-4484-99e4-8c08d746e5bb', 'booking.created', 'booking', '{"customer":"Jane Client"}'),
('945c14f2-7837-4484-99e4-8c08d746e5bb', 'payment.completed', 'transaction', '{"amount_kes":1500}');
