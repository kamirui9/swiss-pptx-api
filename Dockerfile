FROM mcr.microsoft.com/playwright:v1.52.0-noble

WORKDIR /app

# Install Node.js deps
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Copy app code
COPY server.js html2pptx.js ./
COPY templates/ ./templates/

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

EXPOSE 3000

# Use Node.js directly (not Playwright's entrypoint)
ENTRYPOINT []
CMD ["node", "server.js"]
