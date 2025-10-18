FROM node:20-alpine

# native deps for node-gyp builds
RUN apk add --no-cache python3 make g++

WORKDIR /app

# install deps
COPY package*.json ./
RUN npm ci

# build
COPY . .
RUN npm run build

# runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
EXPOSE 3000
EXPOSE 5000
CMD ["npm", "run", "start"]
