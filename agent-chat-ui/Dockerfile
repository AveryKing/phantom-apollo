# Dockerfile for Next.js Frontend
FROM node:20-slim AS builder

WORKDIR /app

# Install pnpm (used in agent-chat-ui)
RUN npm install -g pnpm

# Copy package files first for caching
COPY agent-chat-ui/package*.json ./
COPY agent-chat-ui/pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install

# Build arguments for public variables
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_ASSISTANT_ID=agent

# Set them as ENV for the build process
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_ASSISTANT_ID=$NEXT_PUBLIC_ASSISTANT_ID

# Copy the rest of the UI files
COPY agent-chat-ui/ .

# Build the application
RUN pnpm run build

# Production image
FROM node:20-slim AS runner
WORKDIR /app

# Copy built assets and necessary files from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000
CMD ["npm", "start"]
