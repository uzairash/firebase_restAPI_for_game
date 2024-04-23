# Use the official Node.js image as base
FROM node:latest

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install project dependencies
RUN npm install

# Install Firebase CLI
RUN npm install -g firebase-tools

# Copy the rest of the application code
COPY . .

# Expose the port on which Firebase Functions are running
EXPOSE 5001

# Command to run the Firebase Functions
CMD ["npm", "run", "serve"]
