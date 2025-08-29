export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { csvData } = req.body;
        
        if (!csvData || !Array.isArray(csvData)) {
            return res.status(400).json({ error: 'Invalid CSV data' });
        }

        console.log(`Processing ${csvData.length} orders for file analysis`);
        
        const results = {
            total: 0,
            successful: 0,
            failed: 0,
            files: []
        };

        // Extract all Google Drive URLs from CSV and test accessibility
        for (const order of csvData) {
            if (!order.notes) continue;
            
            const urls = extractGoogleDriveUrls(order.notes);
            if (urls.length === 0) continue;

            for (const url of urls) {
                results.total++;
                
                try {
                    const fileId = extractFileId(url);
                    if (!fileId) {
                        results.failed++;
                        continue;
                    }

                    const testResult = await testFileAccessibility(fileId, order.tracking_number);
                    
                    if (testResult.success) {
                        results.successful++;
                        results.files.push({
                            trackingNumber: order.tracking_number,
                            fileId: fileId,
                            originalUrl: url,
                            fileName: `${order.tracking_number}_${fileId}${testResult.extension}`,
                            fileSize: testResult.fileSize,
                            mimeType: testResult.mimeType,
                            downloadUrl: testResult.downloadUrl
                        });
                    } else {
                        results.failed++;
                        console.log(`Failed to access ${fileId}:`, testResult.error);
                    }
                } catch (error) {
                    results.failed++;
                    console.error('Error processing file:', error);
                }
            }
        }

        console.log(`File analysis complete: ${results.successful}/${results.total} accessible`);
        
        res.json(results);
        
    } catch (error) {
        console.error('File analysis error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

function extractGoogleDriveUrls(notes) {
    if (!notes) return [];
    
    const driveUrlRegex = /https:\/\/drive\.google\.com\/file\/d\/[a-zA-Z0-9_-]+\/view\?usp=drive_link/g;
    const matches = notes.match(driveUrlRegex);
    
    return matches || [];
}

function extractFileId(driveUrl) {
    const fileIdMatch = driveUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)\//);
    return fileIdMatch ? fileIdMatch[1] : null;
}

async function testFileAccessibility(fileId, trackingNumber) {
    try {
        // Try multiple download URLs to test accessibility
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

        let response = null;
        let successUrl = null;

        for (const url of downloadUrls) {
            try {
                console.log(`Testing accessibility of ${fileId} from: ${url}`);
                
                // Use HEAD request to test without downloading full file
                response = await fetch(url, {
                    method: 'HEAD',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    }
                });
                
                if (response.ok && response.headers.get('content-length') !== '0') {
                    const contentType = response.headers.get('content-type') || 'application/octet-stream';
                    
                    // Skip HTML responses (sign-in pages)
                    if (contentType.includes('text/html')) {
                        console.log(`Skipping HTML response from ${url}`);
                        continue;
                    }
                    
                    successUrl = url;
                    break;
                }
            } catch (err) {
                console.log(`Failed to test ${url}:`, err.message);
                continue;
            }
        }

        if (!response || !response.ok) {
            return { success: false, error: 'Could not access file from any URL' };
        }

        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        const contentLength = response.headers.get('content-length');
        
        console.log(`File ${fileId} is accessible from ${successUrl}, Content-Type: ${contentType}, Size: ${contentLength}`);

        // Get file extension based on content type
        let extension = '.bin';
        if (contentType.includes('pdf')) {
            extension = '.pdf';
        } else if (contentType.includes('image/png')) {
            extension = '.png';
        } else if (contentType.includes('image/jpeg') || contentType.includes('image/jpg')) {
            extension = '.jpg';
        } else if (contentType.includes('image/gif')) {
            extension = '.gif';
        } else if (contentType.includes('image/webp')) {
            extension = '.webp';
        } else if (contentType.includes('image/')) {
            extension = '.png'; // Default for unknown image types
        }

        return {
            success: true,
            extension: extension,
            fileSize: parseInt(contentLength) || 0,
            mimeType: contentType,
            downloadUrl: successUrl
        };

    } catch (error) {
        console.error(`Error testing file ${fileId}:`, error);
        return { success: false, error: error.message };
    }
}
