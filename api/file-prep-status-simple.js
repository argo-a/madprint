export default async function handler(req, res) {
    console.log('Simple status endpoint called');
    console.log('Method:', req.method);
    console.log('Query:', req.query);
    
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { jobId } = req.query;

        if (!jobId) {
            return res.status(400).json({ error: 'Job ID is required' });
        }

        // For testing, just return a fake completed status
        res.status(200).json({
            success: true,
            jobId: jobId,
            progress: {
                status: 'completed',
                processed: 38,
                total: 38,
                percentage: 100,
                currentFile: null
            },
            results: {
                totalFiles: 38,
                successfulFiles: 38,
                failedFiles: 0,
                totalSize: 190000000,
                files: Array.from({length: 38}, (_, i) => ({
                    id: `file_${i}`,
                    originalFilename: `test_file_${i}.jpg`,
                    orderNumber: `ORDER_${i + 1}`,
                    customerName: `Test Customer ${i + 1}`,
                    status: 'success',
                    size: 5000000,
                    blobUrl: 'https://example.com/test.jpg',
                    processedFilename: `test_file_${i}_rotated.jpg`
                }))
            }
        });

    } catch (error) {
        console.error('Error in simple status endpoint:', error);
        res.status(500).json({ 
            error: 'Failed to get job status',
            details: error.message 
        });
    }
}
