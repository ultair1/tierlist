# Tier List Maker - Server Setup Instructions

This guide explains how to set up and run the Tier List Maker application on a Debian-based system, such as OpenMediaVault. This setup uses a Node.js backend to handle image uploads and save the tier list state, removing browser storage limitations.

---

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

**Note:** The server will keep running as long as your SSH session is active. For a permanent solution, you might want to look into running the Node.js script as a service using a process manager like `pm2`.

---

### **Step 5: Access Your Tier List**

1.  Find your NAS's local IP address (e.g., `192.168.1.50`). You can usually find this in your router's administration page or by running the command `ip a` on your NAS.
2.  On any computer, phone, or tablet on the **same local network**, open a web browser.
3.  Navigate to `http://<YOUR_NAS_IP>:3000` (for example, `http://192.168.1.50:3000`).

Your tier list application should now be fully functional.
