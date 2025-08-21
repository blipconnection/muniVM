#!/bin/sh
set -eu

while :; do
  # 1) Renovación silenciosa (webroot)
  certbot renew --webroot -w /var/www/certbot --quiet || true

  # 2) Recargar Nginx enviando HUP a través del socket de Docker (sin curl ni docker CLI)
  python3 - <<'PY'
import socket
s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
s.connect("/var/run/docker.sock")
s.sendall(b"POST /v1.41/containers/muni_nginx/kill?signal=HUP HTTP/1.1\r\nHost: docker\r\nContent-Length: 0\r\n\r\n")
_ = s.recv(4096)
s.close()
PY

  # 3) Esperar 12 horas
  sleep 12h
done
