export default async function handler(req, res) {
    console.log('Simple file prep endpoint called');
    console.log('Method:', req.method);
    console.log('Body:', req.body);
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { files, fileUrls, jobId } = req.body;
        
        // Support both 'files' and 'fileUrls' for backward compatibility
        const fileData = files || fileUrls;

        if (!fileData || !Array.isArray(fileData) || fileData.length === 0) {
            console.log('ERROR: Invalid file data provided');
            return res.status(400).json({ error: 'Invalid file data provided' });
        }

        console.log(`Processing ${fileData.length} files`);

        // Just return success without actual processing for now
        res.status(200).json({
            success: true,
            jobId: jobId || `test_job_${Date.now()}`,
            message: `Would process ${fileData.length} files`,
            statusUrl: `/api/file-prep-status?jobId=test_job_${Date.now()}`
        });

    } catch (error) {
        console.error('Error in simple file prep:', error);
        res.status(500).json({ 
            error: 'Failed to start file preparation job',
            details: error.message,
            stack: error.stack
        });
    }
}
