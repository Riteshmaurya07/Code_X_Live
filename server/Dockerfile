# Use official Node.js runtime
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files first (for caching)
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy rest of the application code
COPY . .

# Set environment port
ENV PORT=5000

# Expose port
EXPOSE 5000

# Start the server
CMD ["node", "index.js"]