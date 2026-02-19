FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY one/package*.json ./one/
RUN cd one && npm ci

# Copy source and build
COPY one ./one
RUN cd one && npm run build

# Runtime image
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy only what we need to run
COPY --from=builder /app/one/package*.json ./
COPY --from=builder /app/one/.next ./.next
COPY --from=builder /app/one/public ./public
COPY --from=builder /app/one/node_modules ./node_modules
COPY --from=builder /app/one/scripts ./scripts

EXPOSE 3000
CMD ["npm","run","start"]
