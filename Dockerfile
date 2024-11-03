# Use the official Node.js image as a base
FROM node:16

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Install Puppeteer dependencies
RUN apt-get update && apt-get install -y \
    libnss3 \
    libatk-bridge2.0-0 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm-dev \
    libasound2 \
    fonts-liberation \
    libgtk-3-0 \
    libxss1 \
    libxshmfence1 \
    && rm -rf /var/lib/apt/lists/*

# Set the environment variable to disable the sandbox (optional)
ENV PUPPETEER_SKIP_DOWNLOAD=true

# Run the automation script
CMD ["node", "index.js"] # Replace with your actual script file name