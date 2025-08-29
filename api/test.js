export default async function handler(req, res) {
    console.log('Test endpoint called');
    console.log('Method:', req.method);
    console.log('Headers:', req.headers);
    
    if (req.method === 'GET') {
        res.status(200).json({ 
            success: true, 
            message: 'Test endpoint working',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'unknown'
        });
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}
