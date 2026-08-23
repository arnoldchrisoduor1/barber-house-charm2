import json
import re
import sys
import urllib.request

email = "solo-accept-20260805203200@example.com"
msgs = json.load(urllib.request.urlopen("http://localhost:8025/api/v2/messages?limit=20"))
items = msgs.get("items") or []
match = None
for m in items:
    blob = json.dumps(m)
    if email in blob:
        match = m
        break
if not match:
    print("NO MAIL")
    sys.exit(1)

mid = match["ID"]
raw = urllib.request.urlopen(f"http://localhost:8025/api/v1/messages/{mid}/raw").read().decode(
    "utf-8", "replace"
)
mm = re.search(r"token=([A-Za-z0-9_-]+)", raw)
if not mm:
    print("NO TOKEN")
    print(raw[:1000])
    sys.exit(2)
token = mm.group(1)
print(token)

req = urllib.request.Request(
    "http://localhost:18432/api/v1/auth/verify-email",
    data=json.dumps({"token": token}).encode(),
    headers={"Content-Type": "application/json"},
    method="POST",
)
try:
    with urllib.request.urlopen(req) as resp:
        print("VERIFY", resp.status, resp.read().decode()[:200])
except Exception as e:
    print("VERIFY_ERR", e)
    if hasattr(e, "read"):
        print(e.read().decode())

login_req = urllib.request.Request(
    "http://localhost:18432/api/v1/auth/login",
    data=json.dumps({"email": email, "password": "SoloTest123!"}).encode(),
    headers={"Content-Type": "application/json"},
    method="POST",
)
with urllib.request.urlopen(login_req) as resp:
    login = json.loads(resp.read().decode())
access = login["accessToken"]
me_req = urllib.request.Request(
    "http://localhost:18432/api/v1/me",
    headers={"Authorization": f"Bearer {access}"},
)
with urllib.request.urlopen(me_req) as resp:
    me = json.loads(resp.read().decode())
org = me.get("organization") or me.get("activeOrg") or {}
print(
    "businessType=",
    org.get("businessType"),
    "specialty=",
    org.get("specialty"),
    "plan=",
    (me.get("subscription") or {}).get("plan"),
)
