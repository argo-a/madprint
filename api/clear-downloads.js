export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Since we're not storing files locally anymore, this just clears the cache
        // In a real implementation, you might clear a Redis cache or database entries
        
        console.log('Cache clear requested - no local files to delete');

        res.json({
            message: 'Cache cleared successfully',
            deletedCount: 0,
            totalSize: 0,
            totalSizeMB: '0.00',
            note: 'Files are now served on-demand, no local storage used'
        });
        
    } catch (error) {
        console.error('Error clearing cache:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
