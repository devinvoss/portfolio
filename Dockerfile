FROM node:16-alpine as build
WORKDIR /app/builder
COPY . .
RUN npm i
