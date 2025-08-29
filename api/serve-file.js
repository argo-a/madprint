export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { fileId, downloadUrl } = req.query;
        
        if (!fileId) {
            return res.status(400).json({ error: 'fileId parameter required' });
        }

        // Security: Only allow alphanumeric, underscore, dash
        if (!/^[a-zA-Z0-9_-]+$/.test(fileId)) {
            return res.status(400).json({ error: 'Invalid fileId' });
        }

        let targetUrl = downloadUrl;
        
        // If no downloadUrl provided, try to construct one
        if (!targetUrl) {
            const downloadUrls = [
                `https://drive.usercontent.google.com/u/0/uc?id=${fileId}&export=download`,
                `https://drive.usercontent.google.com/u/1/uc?id=${fileId}&export=download`,
                `https://drive.usercontent.google.com/u/2/uc?id=${fileId}&export=download`,
                `https://drive.usercontent.google.com/u/3/uc?id=${fileId}&export=download`,
                `https://drive.usercontent.google.com/u/4/uc?id=${fileId}&export=download`,
                `https://drive.usercontent.google.com/u/5/uc?id=${fileId}&export=download`,
                `https://drive.usercontent.google.com/u/6/uc?id=${fileId}&export=download`,
                `https://drive.google.com/uc?export=download&id=${fileId}`,
                `https://drive.google.com/uc?id=${fileId}&export=download`
            ];

            // Try to find a working URL
            for (const url of downloadUrls) {
                try {
                    const testResponse = await fetch(url, {
                        method: 'HEAD',
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                        }
                    });
                    
                    if (testResponse.ok && !testResponse.headers.get('content-type')?.includes('text/html')) {
                        targetUrl = url;
                        break;
                    }
                } catch (err) {
                    continue;
                }
            }
        }

        if (!targetUrl) {
            return res.status(404).json({ error: 'File not accessible' });
        }

        console.log(`Proxying file ${fileId} from: ${targetUrl}`);

        // Fetch the file from Google Drive
        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) {
            return res.status(response.status).json({ error: 'Failed to fetch file from Google Drive' });
        }

        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        const contentLength = response.headers.get('content-length');

        // Skip HTML responses (sign-in pages)
        if (contentType.includes('text/html')) {
            return res.status(403).json({ error: 'File requires authentication' });
        }

        // Set headers
        res.setHeader('Content-Type', contentType);
        if (contentLength) {
            res.setHeader('Content-Length', contentLength);
        }
        res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
        res.setHeader('Access-Control-Allow-Origin', '*');
        
        // Stream the file
        const reader = response.body.getReader();
        
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(value);
            }
            res.end();
        } catch (streamError) {
            console.error('Error streaming file:', streamError);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Error streaming file' });
            }
        }
        
    } catch (error) {
        console.error('Error serving file:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
