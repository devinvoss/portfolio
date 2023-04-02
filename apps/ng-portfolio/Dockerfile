FROM portfolio-base-image:nx-base AS builder

WORKDIR /app/builder
COPY . .
RUN npx nx build ng-portfolio --configuration=production

FROM nginx:1.23.3-alpine

WORKDIR /usr/share/nginx/html

COPY --from=builder /app/builder/dist/apps/ng-portfolio ./
COPY --from=builder /app/builder/apps/ng-portfolio/nginx.conf /etc/nginx/nginx.conf