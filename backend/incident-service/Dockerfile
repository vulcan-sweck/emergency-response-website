# Dockerfile — Node.js Microservice
# Used by auth-service, incident-service, dispatch-service, analytics-service
#
# Place a copy of this file in each service's root directory.

FROM node:20-alpine

# Set working directory inside container
WORKDIR /app

# Copy dependency manifests first (Docker layer cache optimisation)
COPY package*.json ./

# Install production dependencies only
RUN npm install --omit=dev

# Copy all source files
COPY . .

# Expose the service port (overridden per-service via docker-compose env)
EXPOSE 3000

# Start the server
CMD ["node", "src/server.js"]
