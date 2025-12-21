# Use Node.js 22 as base image
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy all workspace files
COPY . .

# Install dependencies and build the application
RUN npm install --legacy-peer-deps && \
    npm run build:libs && \
    npm run start:bot -- --configuration=production

# Expose port 3000 (Render will use PORT env var)
EXPOSE 3000

# Start the application
CMD ["node", "apps/ikea-circularity-bot/dist/main.js"]