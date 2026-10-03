FROM node:24-alpine AS build
WORKDIR /app/builder
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
