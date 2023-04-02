FROM portfolio-base-image:nx-base AS builder

WORKDIR /app/builder
COPY . .
RUN npx nx build api --configuration=production

FROM portfolio-base-image:nx-base

WORKDIR /app
COPY --from=builder /app/builder ./

CMD ["node", "./dist/apps/api/main.js"]