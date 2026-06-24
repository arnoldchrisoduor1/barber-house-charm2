import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 10,
  duration: "30s",
  thresholds: {
    http_req_duration: ["p(95)<500"],
    http_req_failed: ["rate<0.05"],
  },
};

const BASE = __ENV.API_URL || "http://localhost:8080";

export default function () {
  const health = http.get(`${BASE}/health`);
  check(health, { "health ok": (r) => r.status === 200 });
  sleep(1);
}
