import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 10,
  duration: "30s",
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<800"],
  },
};

const API = __ENV.API_URL || "http://localhost:8080";

export default function () {
  const health = http.get(`${API}/health`);
  check(health, { "health ok": (r) => r.status === 200 });

  const book = http.post(
    `${API}/api/v1/organizations/public/demo-salon/bookings`,
    JSON.stringify({
      phone: "+2547" + Math.floor(Math.random() * 1e8),
      bookingDate: new Date().toISOString().slice(0, 10),
      startTime: "10:00",
      endTime: "10:30",
      fullName: "Load Test",
    }),
    { headers: { "Content-Type": "application/json" } },
  );
  check(book, { "public book accepted or known 404": (r) => r.status === 201 || r.status === 404 || r.status === 409 });

  const ipn = http.post(
    `${API}/api/v1/integrations/pesapal/ipn?org_id=00000000-0000-0000-0000-000000000001`,
    JSON.stringify({ OrderTrackingId: "k6-test", OrderMerchantReference: "k6-" + __VU }),
    { headers: { "Content-Type": "application/json" } },
  );
  check(ipn, { "ipn handled": (r) => r.status >= 200 && r.status < 500 });

  sleep(1);
}
