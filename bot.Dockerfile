FROM node:20-alpine
WORKDIR /app
# Copy bot package info
COPY bot/package.json ./
# Bypass npm ci and package-lock issues by forcing standard install
RUN npm install

# Copy bot source code
COPY bot/ ./

# Run the bot
EXPOSE 8080
CMD ["node", "index.js"]
