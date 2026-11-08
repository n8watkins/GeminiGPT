# Self-hosting image. Production on Render uses its native Node runtime
# (render.yaml); this file is for running GeminiGPT anywhere else.
#
# Build:  docker build --build-arg NEXT_PUBLIC_APP_URL=https://chat.example.com -t geminigpt .
# Run:    docker run -p 3000:3000 -e GEMINI_API_KEY=... -e NEXTAUTH_SECRET=... \
#           -e PRODUCTION_URL=https://chat.example.com geminigpt
#
# No env file is copied into the image (.dockerignore excludes .env*):
# secrets and server config come from the container's environment at run time.

FROM node:24-alpine AS build

# native deps for node-gyp builds
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# NEXT_PUBLIC_* values are public and baked into the client bundle at build time.
ARG NEXT_PUBLIC_APP_URL=""
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build && npm prune --omit=dev

FROM node:24-alpine

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=build --chown=node:node /app ./
RUN mkdir -p data && chown node:node data
USER node

EXPOSE 3000
EXPOSE 5000
CMD ["npm", "run", "start"]
