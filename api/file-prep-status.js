export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { jobId } = req.query;

        if (!jobId) {
            return res.status(400).json({ error: 'Job ID is required' });
        }

        // Fetch job metadata from Vercel Blob
        const metadataUrl = `https://blob.vercel-storage.com/jobs/${jobId}/metadata.json`;
        
        try {
            const response = await fetch(metadataUrl);
            
            if (!response.ok) {
                if (response.status === 404) {
                    return res.status(404).json({ error: 'Job not found' });
                }
                throw new Error(`Failed to fetch job metadata: ${response.status}`);
            }

            const job = await response.json();

            // Calculate progress percentage
            const progressPercentage = job.totalFiles > 0 
                ? Math.round((job.processedFiles / job.totalFiles) * 100)
                : 0;

            // Count files by status
            const statusCounts = job.files.reduce((counts, file) => {
                counts[file.status] = (counts[file.status] || 0) + 1;
                return counts;
            }, {});

            // Prepare response
            const statusResponse = {
                jobId: job.id,
                status: job.status,
                progress: {
                    percentage: progressPercentage,
                    processed: job.processedFiles,
                    total: job.totalFiles,
                    remaining: job.totalFiles - job.processedFiles
                },
                statusCounts,
                startTime: job.startTime,
                endTime: job.endTime,
                files: job.files.map(file => ({
                    id: file.id,
                    trackingNumber: file.trackingNumber,
                    customerName: file.customerName,
                    status: file.status,
                    error: file.error,
                    processedUrl: file.processedUrl,
                    hasProcessedFile: !!file.processedUrl
                })),
                isComplete: job.status === 'completed' || job.status === 'error',
                hasErrors: job.files.some(file => file.status === 'error'),
                downloadableFiles: job.files.filter(file => file.processedUrl).length
            };

            // Add timing information if job is complete
            if (job.endTime && job.startTime) {
                const duration = new Date(job.endTime) - new Date(job.startTime);
                statusResponse.duration = {
                    milliseconds: duration,
                    seconds: Math.round(duration / 1000),
                    minutes: Math.round(duration / 60000)
                };
            }

            res.status(200).json(statusResponse);

        } catch (fetchError) {
            console.error('Error fetching job metadata:', fetchError);
            return res.status(500).json({ 
                error: 'Failed to fetch job status',
                details: fetchError.message 
            });
        }

    } catch (error) {
        console.error('Error in file-prep-status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
