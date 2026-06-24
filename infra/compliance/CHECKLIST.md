# Compliance checklist (pre live money)

- [ ] Legal review: CBK PSP / payment aggregator posture for platform-collect + OpenFloat disburse
- [ ] AML/KYC on tenant onboarding (ID, business registration)
- [ ] Settlement T&Cs: hold periods, dispute window, refund policy
- [ ] PCI: no card data stored; Pesapal handles card flows
- [ ] Data retention + DSR process documented
- [ ] Pen-test remediation complete

See [plans/06-billing-and-features.md](../../plans/06-billing-and-features.md) compliance flag.

## PWA / offline
- [ ] Service worker caches app shell (`public/sw.js`)
- [ ] Field staff flows degrade gracefully when offline (queue board shows last-known state)

## Scale-out
- [ ] Postgres/Redis externalized before horizontal API scaling
- [ ] WS hub backed by Redis when running multiple API instances
