// --- server.js ---
// This is the backend server that runs on your NAS using Node.js

const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000; // You can change this port if you need to

// --- CONFIGURATION ---
const UPLOADS_DIR = path.join(__dirname, 'public/images');
const STATE_FILE = path.join(__dirname, 'data/state.json');

// Ensure directories exist
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'));
}


// --- MIDDLEWARE ---

// Serve the main HTML, CSS, and client-side JS files
app.use(express.static(path.join(__dirname, 'public')));
// Middleware to parse JSON bodies
app.use(express.json());


// --- MULTER SETUP (for file uploads) ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOADS_DIR);
    },
    filename: function (req, file, cb) {
        // Create a unique filename to avoid overwrites
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });


// --- API ENDPOINTS ---

// UPDATED: Endpoint to handle multiple image uploads
app.post('/upload', upload.array('tierImage', 12), (req, res) => { // Allows up to 12 files at once
    if (!req.files || req.files.length === 0) {
        return res.status(400).send('No files uploaded.');
    }
    // Map the array of uploaded files to an array of their paths
    const filePaths = req.files.map(file => `/images/${file.filename}`);
    
    // Respond with a single JSON object containing the array of new paths
    res.json({ filePaths: filePaths });
});

// Endpoint to get the current state of the tier list (positions)
app.get('/state', (req, res) => {
    if (fs.existsSync(STATE_FILE)) {
        res.sendFile(STATE_FILE);
    } else {
        // If no state file exists, return a default empty state
        res.json({
            "_pool": [] 
        });
    }
});

// Endpoint to save the state of the tier list
app.post('/save', (req, res) => {
    const newState = req.body;
    fs.writeFile(STATE_FILE, JSON.stringify(newState, null, 2), (err) => {
        if (err) {
            console.error("Error saving state:", err);
            return res.status(500).send('Error saving state.');
        }
        res.status(200).send('State saved successfully.');
    });
});

// Endpoint to delete a specific image
app.post('/delete', (req, res) => {
    const { filename } = req.body;

    if (!filename) {
        return res.status(400).send('Filename not provided.');
    }

    if (filename.includes('..')) {
        return res.status(400).send('Invalid filename.');
    }

    const filePath = path.join(UPLOADS_DIR, filename);

    fs.unlink(filePath, (err) => {
        if (err) {
            if (err.code === 'ENOENT') {
                return res.status(200).send('File already deleted.');
            }
            console.error(`Error deleting file: ${filePath}`, err);
            return res.status(500).send('Error deleting file.');
        }
        console.log(`Deleted file: ${filePath}`);
        res.status(200).send('File deleted successfully.');
    });
});

// Endpoint to reset everything: clear state and delete all images
app.post('/reset-all', (req, res) => {
    fs.writeFile(STATE_FILE, JSON.stringify({ "_pool": [] }, null, 2), (err) => {
        if (err) {
            console.error("Error clearing state file:", err);
            return res.status(500).send('Error clearing state.');
        }

        fs.readdir(UPLOADS_DIR, (err, files) => {
            if (err) {
                console.error("Error reading images directory for reset:", err);
                return res.status(500).send('Error reading images directory.');
            }

            if (files.length === 0) {
                 return res.status(200).send('Reset complete. No files to delete.');
            }

            let filesToDelete = files.length;
            let deleteErrors = [];

            files.forEach(file => {
                const filePath = path.join(UPLOADS_DIR, file);
                fs.unlink(filePath, (unlinkErr) => {
                    if (unlinkErr) {
                        console.error(`Error deleting file during reset: ${filePath}`, unlinkErr);
                        deleteErrors.push(file);
                    }
                    filesToDelete--;
                    if (filesToDelete === 0) {
                        if (deleteErrors.length > 0) {
                            return res.status(500).send(`Reset completed, but failed to delete: ${deleteErrors.join(', ')}`);
                        }
                        console.log('All images and state have been reset.');
                        res.status(200).send('Reset complete.');
                    }
                });
            });
        });
    });
});

// --- START THE SERVER ---
app.listen(port, () => {
    console.log(`Tier List server running at http://localhost:${port}`);
    console.log(`Make sure to access it via your NAS's IP address on your network!`);
});
