FROM oven/bun:1.3.5-slim

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY src ./src
COPY drizzle ./drizzle
COPY scripts ./scripts
COPY contract/shadow-diff.ts contract/normalize.ts contract/deviations.ts ./contract/
COPY --chmod=755 docker-entrypoint.sh /app/docker-entrypoint.sh

RUN useradd --create-home --uid 10001 appuser \
    && mkdir -p /app/static/uploads \
    && chown -R appuser:appuser /app

USER appuser

ENV NODE_ENV=production PORT=8000

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
    CMD bun -e "fetch('http://127.0.0.1:8000/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["bun", "src/server.ts"]
