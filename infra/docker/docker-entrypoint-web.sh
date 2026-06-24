if [ -f /app/apps/web/server.js ]; then
  exec node /app/apps/web/server.js
fi

if [ -f /app/server.js ]; then
  exec node /app/server.js
fi

echo "server.js not found under /app" >&2
find /app -name server.js >&2 || true
exit 1
