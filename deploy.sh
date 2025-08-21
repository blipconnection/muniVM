#!/usr/bin/env bash
set -Eeuo pipefail

# -------- Helpers --------
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$here"

dc() {
  if command -v docker-compose >/dev/null 2>&1; then
    docker-compose "$@"
  else
    docker compose "$@"
  fi
}

# -------- Normalizar CRLF por si .env llega desde Windows --------
if [[ -f .env ]] && grep -q $'\r' .env; then
  tmp="$(mktemp)"; tr -d '\r' < .env > "$tmp" && mv "$tmp" .env
fi

# -------- Cargar .env --------
if [[ ! -f .env ]]; then
  echo "ERROR: No existe .env en $here" >&2
  exit 1
fi
set -a
source ./.env
set +a

: "${DOMAIN:?Falta DOMAIN en .env}"
: "${CERTBOT_EMAIL:?Falta CERTBOT_EMAIL en .env}"

echo "==> DOMAIN: $DOMAIN"
echo "==> CERTBOT_EMAIL: $CERTBOT_EMAIL"

# -------- Render de plantillas Nginx --------
mkdir -p nginx/conf.d nginx/stream.d

if [[ ! -f nginx/nginx.conf.template ]] || [[ ! -f nginx/conf.d/site.conf.template ]]; then
  echo "ERROR: Faltan plantillas: nginx/nginx.conf.template y/o nginx/conf.d/site.conf.template" >&2
  exit 1
fi

# Normalizar CRLF de plantillas por si llegaron desde Windows
for f in nginx/nginx.conf.template nginx/conf.d/site.conf.template; do
  if grep -q $'\r' "$f"; then
    tmp="$(mktemp)"; tr -d '\r' < "$f" > "$tmp" && mv "$tmp" "$f"
  fi
done

# Escapar caracteres especiales para sed
domain_escaped="$(printf '%s' "$DOMAIN" | sed 's/[.[\*^$/&]/\\&/g')"

# Render: TEMPLATE -> archivo real (NUNCA al mismo archivo)
sed "s/{{DOMAIN}}/${domain_escaped}/g" nginx/nginx.conf.template > nginx/nginx.conf
sed "s/{{DOMAIN}}/${domain_escaped}/g" nginx/conf.d/site.conf.template > nginx/conf.d/site.conf

echo "==> Renderizadas nginx/nginx.conf y nginx/conf.d/site.conf"

# -------- Preflight: validar config Nginx antes de levantar --------
echo "==> Construyendo imagen de Nginx (con módulo stream)..."
dc build nginx

echo "==> Preflight nginx -t usando el servicio nginx..."
if ! dc run --rm nginx nginx -t; then
  echo "ERROR: nginx -t falló. Revisá nginx/nginx.conf y nginx/conf.d/*.conf" >&2
  dc logs nginx --tail=200 || true
  exit 1
fi

# -------- Levantar base (app, api, mongo, emqx) --------
echo "==> Levantando base (app, api, mongo, emqx)..."
dc up -d app api mongo emqx

# -------- Chequear si ya existe el certificado --------
echo "==> Comprobando certificado existente para ${DOMAIN}..."
if dc run --rm --entrypoint sh certbot -c "test -f /etc/letsencrypt/live/${DOMAIN}/fullchain.pem && test -f /etc/letsencrypt/live/${DOMAIN}/privkey.pem"; then
  echo "==> Certificado YA existe. Saltando emisión inicial."
else
  echo "==> No existe certificado. Intentando emisión inicial (standalone en :80)..."
  dc stop nginx || true

  # Advertir si hay algo en :80
  if ss -ltnp 2>/dev/null | grep -q ':80 '; then
    echo "ADVERTENCIA: Hay un proceso escuchando en :80. El modo standalone puede fallar." >&2
  fi

  dc run --rm -p 80:80 certbot certonly --standalone \
    -d "${DOMAIN}" \
    -m "${CERTBOT_EMAIL}" --agree-tos --no-eff-email \
    --keep-until-expiring --preferred-challenges http

  echo "==> Verificando archivos emitidos..."
  dc run --rm --entrypoint sh certbot -c "ls -l /etc/letsencrypt/live/${DOMAIN}/fullchain.pem /etc/letsencrypt/live/${DOMAIN}/privkey.pem"
fi

# -------- Levantar Nginx + renovador --------
echo "==> Levantando Nginx y certbot-renew..."
dc up -d nginx certbot-renew

# Recargar Nginx por las dudas (si ya corría)
docker kill -s HUP muni_nginx >/dev/null 2>&1 || true

# -------- Validaciones --------
echo "==> Validando sintaxis Nginx dentro del contenedor..."
dc exec nginx nginx -t || { echo "ERROR: nginx -t dentro del contenedor falló"; dc logs --tail=200 nginx; exit 1; }

echo "==> OK. Resumen de endpoints:"
cat <<EOF

App (PWA):              https://${DOMAIN}/
API:                    https://${DOMAIN}/api
MQTT WebSocket (WSS):   wss://${DOMAIN}/mqtt
EMQX Dashboard (HTTPS): https://${DOMAIN}:18084/
MQTT TLS nativo:        ${DOMAIN}:8883

Renovación automática: contenedor 'certbot-renew' (cada ~12h).
Para ver logs:  docker logs -f muni_certbot_renew
EOF
