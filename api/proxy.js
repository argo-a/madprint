export default async function handler(req, res) {
  // Enable CORS for all origins
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { url } = req.query;

  if (!url) {
    res.status(400).json({ error: 'URL parameter is required' });
    return;
  }

  // Validate that it's a Google Drive URL
  if (!url.includes('drive.google.com') && !url.includes('googleusercontent.com')) {
    res.status(400).json({ error: 'Only Google Drive URLs are allowed' });
    return;
  }

  try {
    console.log('Fetching URL:', url);

    // Fetch the file from Google Drive
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    if (!response.ok) {
      console.error('Fetch failed:', response.status, response.statusText);
      res.status(response.status).json({ 
        error: `Failed to fetch file: ${response.status} ${response.statusText}` 
      });
      return;
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentLength = response.headers.get('content-length');
    
    console.log('Response headers:', {
      contentType,
      contentLength,
      status: response.status
    });

    // Check if it's an HTML page (Google Drive sometimes returns HTML instead of the file)
    if (contentType.includes('text/html')) {
      const text = await response.text();
      if (text.includes('Google Drive') || text.includes('Sign in')) {
        res.status(403).json({ 
          error: 'File may not be publicly accessible or requires authentication' 
        });
        return;
      }
    }

    // Get the file data
    const arrayBuffer = await response.arrayBuffer();
    
    if (arrayBuffer.byteLength === 0) {
      res.status(404).json({ error: 'File is empty or not found' });
      return;
    }

    console.log('Successfully fetched file:', arrayBuffer.byteLength, 'bytes');

    // Set appropriate headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', arrayBuffer.byteLength);
    
    // Send the file data
    res.send(Buffer.from(arrayBuffer));

  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch file', 
      details: error.message 
    });
  }
}
