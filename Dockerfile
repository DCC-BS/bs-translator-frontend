# Stage 1: Build the application
FROM node:24-alpine AS build

# Install bun
RUN npm install -g bun

# Set the working directory
WORKDIR /app

# Set Node.js memory limit for build process
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Copy package.json and bun.lockb
COPY ./package*.json ./bun.lock* ./

# Install dependencies using bun
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN bun x nuxi prepare
RUN bun x nuxi build

# Stage 2: Run the application
FROM node:24-alpine

# Set the working directory
WORKDIR /app

# Copy the built application from the build stage
COPY --from=build /app/.output ./

# Expose the port the app runs on
EXPOSE 3000

# Start the application
ENTRYPOINT ["node", "./server/index.mjs"]
