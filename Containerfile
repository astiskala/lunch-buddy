FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

FROM joseluisq/static-web-server:2
COPY --from=build /app/dist/lunch-buddy/browser /public
COPY sws.toml /config.toml
ENV SERVER_CONFIG_FILE=/config.toml
EXPOSE 3000
