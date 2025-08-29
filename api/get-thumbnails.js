import { list } from '@vercel/blob';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { trackingNumber, orderNumber } = req.query;

        if (!trackingNumber && !orderNumber) {
            return res.status(400).json({ error: 'Either trackingNumber or orderNumber is required' });
        }

        // List all thumbnails
        const { blobs } = await list({
            prefix: 'thumbnails/',
            limit: 1000
        });

        // Filter thumbnails based on tracking number or order number
        const matchingThumbnails = blobs.filter(blob => {
            const fileName = blob.pathname;
            
            if (trackingNumber && fileName.includes(trackingNumber)) {
                return true;
            }
            
            if (orderNumber && fileName.includes(`_${orderNumber}_`)) {
                return true;
            }
            
            return false;
        });

        // Format the response
        const thumbnails = matchingThumbnails.map(blob => ({
            url: blob.url,
            filename: blob.pathname.split('/').pop(),
            trackingNumber: extractTrackingFromFilename(blob.pathname),
            orderNumber: extractOrderFromFilename(blob.pathname),
            uploadedAt: blob.uploadedAt
        }));

        res.status(200).json({
            success: true,
            thumbnails: thumbnails,
            count: thumbnails.length
        });

    } catch (error) {
        console.error('Error retrieving thumbnails:', error);
        res.status(500).json({ error: 'Failed to retrieve thumbnails' });
    }
}

function extractTrackingFromFilename(pathname) {
    // Extract tracking number from filename like "thumbnails/1Z999AA1234567890_12345_thumb.jpg"
    const filename = pathname.split('/').pop();
    const parts = filename.split('_');
    return parts[0] || null;
}

function extractOrderFromFilename(pathname) {
    // Extract order number from filename like "thumbnails/1Z999AA1234567890_12345_thumb.jpg"
    const filename = pathname.split('/').pop();
    const parts = filename.split('_');
    return parts[1] || null;
}
