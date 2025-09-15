# Use the official Node.js image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install pnpm globally
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install

# Copy the source code
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Command to run the development server
CMD ["pnpm", "dev"]