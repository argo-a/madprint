import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOWNLOADS_DIR = path.join(__dirname, '..', 'downloads');

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        let deletedCount = 0;
        let totalSize = 0;

        // Check if downloads directory exists
        if (!fs.existsSync(DOWNLOADS_DIR)) {
            return res.json({ 
                message: 'Downloads directory does not exist',
                deletedCount: 0,
                totalSize: 0
            });
        }

        // Read all files in downloads directory
        const files = fs.readdirSync(DOWNLOADS_DIR);
        
        for (const file of files) {
            const filePath = path.join(DOWNLOADS_DIR, file);
            const stats = fs.statSync(filePath);
            
            if (stats.isFile()) {
                totalSize += stats.size;
                fs.unlinkSync(filePath);
                deletedCount++;
                console.log(`Deleted: ${file} (${stats.size} bytes)`);
            }
        }

        console.log(`Cleared downloads: ${deletedCount} files, ${totalSize} bytes total`);

        res.json({
            message: `Successfully cleared downloads folder`,
            deletedCount: deletedCount,
            totalSize: totalSize,
            totalSizeMB: (totalSize / 1024 / 1024).toFixed(2)
        });
        
    } catch (error) {
        console.error('Error clearing downloads:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
