# Dockerfile for Next.js Frontend
FROM node:20-slim AS builder

WORKDIR /app

# Install pnpm (used in agent-chat-ui)
RUN npm install -g pnpm

# Copy only the UI package files
COPY agent-chat-ui/package*.json ./agent-chat-ui/
COPY agent-chat-ui/pnpm-lock.yaml* ./agent-chat-ui/

# Install dependencies
WORKDIR /app/agent-chat-ui
RUN pnpm install

# Build arguments for public variables
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_ASSISTANT_ID=agent

# Set them as ENV for the build process
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_ASSISTANT_ID=$NEXT_PUBLIC_ASSISTANT_ID

# Copy everything else and build
COPY agent-chat-ui/ .

RUN pnpm run build

# Production image
FROM node:20-slim AS runner
WORKDIR /app

COPY --from=builder /app/agent-chat-ui/.next ./.next
COPY --from=builder /app/agent-chat-ui/public ./public
COPY --from=builder /app/agent-chat-ui/package.json ./package.json
COPY --from=builder /app/agent-chat-ui/next.config.mjs ./next.config.mjs
COPY --from=builder /app/agent-chat-ui/node_modules ./node_modules

EXPOSE 3000
CMD ["npm", "start"]
