import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOWNLOADS_DIR = path.join(__dirname, '..', 'downloads');

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { fileName } = req.query;
        
        if (!fileName) {
            return res.status(400).json({ error: 'fileName parameter required' });
        }

        // Security: Only allow alphanumeric, underscore, dash, and dot
        if (!/^[a-zA-Z0-9_.-]+$/.test(fileName)) {
            return res.status(400).json({ error: 'Invalid fileName' });
        }

        const filePath = path.join(DOWNLOADS_DIR, fileName);
        
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Get file stats
        const stats = fs.statSync(filePath);
        const fileExtension = path.extname(fileName).toLowerCase();
        
        // Set appropriate content type
        let contentType = 'application/octet-stream';
        if (fileExtension === '.pdf') {
            contentType = 'application/pdf';
        } else if (fileExtension === '.png') {
            contentType = 'image/png';
        } else if (fileExtension === '.jpg' || fileExtension === '.jpeg') {
            contentType = 'image/jpeg';
        } else if (fileExtension === '.gif') {
            contentType = 'image/gif';
        } else if (fileExtension === '.webp') {
            contentType = 'image/webp';
        }

        // Set headers
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', stats.size);
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
        
        // Stream the file
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
        
    } catch (error) {
        console.error('Error serving file:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
