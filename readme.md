# Tier List Maker - Server Setup Instructions

This guide explains how to set up and run the Tier List Maker application on a Debian-based system, such as OpenMediaVault. This setup uses a Node.js backend to handle image uploads and save the tier list state, removing browser storage limitations.

The guide is split into two sections:
1.  **Manual Setup:** For running the application directly with Node.js.
2.  **Docker Setup (Recommended):** For running the application as a persistent service that starts automatically with your NAS.

---

## **Part 1: Manual Setup**

### **Step 1: Create the Folder Structure**

First, connect to your NAS or server using SSH. Once connected, run the following commands to create the necessary folders for the project.

```bash
# Create a main directory for the application
mkdir tier-list-app

# Enter the new directory
cd tier-list-app

# Create a 'public' folder for files the browser needs (frontend)
mkdir public

# Create a 'data' folder for the saved state file
mkdir data

# Inside 'public', create a folder to store uploaded images
mkdir public/images
```

---

### **Step 2: Place Your Files**

Next, you need to place the application files into the correct folders you just created. You can do this using `scp`, `sftp`, or by copying the text into new files using a command-line editor like `nano`.

The final folder structure should look like this:

```
tier-list-app/
|
|-- server.js           # The backend server code
|
|-- data/               # The server will create state.json here
|
`-- public/
    |-- index.html
    |-- style.css
    |-- script.js       # The client-side script
    `-- images/         # Uploaded images will be saved here
```

---

### **Step 3: Install Node.js and Dependencies**

From inside the main `tier-list-app` directory, run these commands to install Node.js and the required packages for the server.

```bash
# Update your system's package list
sudo apt update

# Install Node.js and the Node Package Manager (npm)
sudo apt install nodejs npm -y

# Initialize a Node.js project. You can press Enter for all questions.
npm init -y

# Install the required packages (Express for the server, Multer for file uploads)
npm install express multer
```

---

### **Step 4: Start the Server**

You are now ready to run the application. From inside the `tier-list-app` folder, execute the following command:

```bash
node server.js
```

If everything is successful, you will see the following output in your terminal, and the server will be running:

```
Tier List server running at http://localhost:3000
Make sure to access it via your NAS's IP address on your network!
```

---

### **Step 5: Access Your Tier List**

1.  Find your NAS's local IP address (e.g., `192.168.1.50`). You can usually find this in your router's administration page or by running the command `ip a` on your NAS.
2.  On any computer, phone, or tablet on the **same local network**, open a web browser.
3.  Navigate to `http://<YOUR_NAS_IP>:3000` (for example, `http://192.168.1.50:3000`).

Your tier list application should now be fully functional.

---
---

## **Part 2: Docker Setup (Recommended)**

This method automates the setup and ensures your application always runs in the background. It assumes you have already completed **Step 1** and **Step 2** from the manual setup.

### **Step 1: Install Docker**

If you don't already have Docker on your system, you can install it from the command line.

```bash
# Install Docker
curl -sSL [https://get.docker.com](https://get.docker.com) | sh

# Add the current user to the docker group to run docker without sudo
sudo usermod -aG docker $USER

# Log out and log back in for the group changes to take effect
```

You will also need Docker Compose.

```bash
# Install Docker Compose
sudo apt-get install docker-compose-plugin -y
```

### **Step 2: Create the `Dockerfile`**

In your main `tier-list-app` directory, create a file named `Dockerfile` (with no file extension) and add the following content. This file defines how to build your application's image.

```Dockerfile
# Use an official Node.js runtime as a base image
FROM node:18-slim

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install application dependencies
RUN npm install

# Copy the rest of your application's code to the working directory
COPY . .

# Your app binds to port 3000, so expose it
EXPOSE 3000

# Define the command to run your app
CMD [ "node", "server.js" ]
```

### **Step 3: Create the `docker-compose.yml` file**

In the same `tier-list-app` directory, create a file named `docker-compose.yml`. This file tells Docker how to run your application and connect the folders for persistent storage.

```yaml
services:
  tier-list-app:
    build: .
    container_name: tier-list-maker
    ports:
      - "3000:3000"
    volumes:
      - ./public/images:/usr/src/app/public/images
      - ./data:/usr/src/app/data
    restart: unless-stopped
```

### **Step 4: Build and Run the Application**

With the `Dockerfile` and `docker-compose.yml` files created, you can now start your application with a single command. Make sure you are in the `tier-list-app` directory.

```bash
# Build the image and start the container in the background
docker-compose up --build -d
```

Docker will now download the Node.js image, build your application, and start it. The `-d` flag runs it in "detached" mode, so it will continue running even if you close your SSH session. The `restart: unless-stopped` policy ensures it will automatically start when your NAS boots up.

You can now access your tier list just as before, by navigating to `http://<YOUR_NAS_IP>:3000`.
