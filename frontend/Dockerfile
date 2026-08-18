# --- Build asamasi: CRA (craco) production build ---
FROM node:20-alpine AS build

WORKDIR /app

# package*.json once kopyalanir: kaynak kod degistiginde npm ci katmani
# cache'ten gelir, her build'de bagimliliklar yeniden inmez.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# CRA env degiskenlerini BUILD sirasinda bundle'a gomer; runtime'da degistirilemez.
# Bu yuzden ARG olarak aliniyor ve compose/CI tarafindan besleniyor.
ARG REACT_APP_API_URL
ARG REACT_APP_MAPBOX_TOKEN
ENV REACT_APP_API_URL=$REACT_APP_API_URL \
    REACT_APP_MAPBOX_TOKEN=$REACT_APP_MAPBOX_TOKEN \
    NODE_ENV=production \
    CI=false

RUN npm run build

# --- Servis asamasi: sadece statik ciktilar + nginx ---
FROM nginx:1.27-alpine

COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY security-headers.conf /etc/nginx/snippets/security-headers.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1/healthz || exit 1
