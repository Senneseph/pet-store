# Web service — serves the Pet Store demo (and the meta-project root it depends on).
FROM nginx:1.25-alpine

COPY app/environment/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/pet-store/app/index.html || exit 1
