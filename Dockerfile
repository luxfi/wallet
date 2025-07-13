# Build stage
FROM node:20-alpine AS builder

# Install dependencies for building
RUN apk add --no-cache python3 make g++ git bash

WORKDIR /app

# Copy package files
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn

# Install dependencies using yarn 4
RUN corepack enable && \
    yarn install --immutable

# Copy application code
COPY . .

# Build the application
RUN yarn app:web:build

# Production stage
FROM node:20-alpine

RUN apk add --no-cache --upgrade bash

WORKDIR /app

# Install serve globally
RUN npm install -g serve

# Copy built application from builder
COPY --from=builder /app/apps/web/build ./build
COPY --from=builder /app/package.json ./

# Expose port
EXPOSE 3000

# Start the application
CMD ["serve", "build", "-l", "3000"]