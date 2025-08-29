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
  if (!url.includes('drive.google.com') && !url.includes('googleusercontent.com') && !url.includes('lh3.googleusercontent.com')) {
    res.status(400).json({ error: 'Only Google Drive URLs are allowed' });
    return;
  }

  try {
    console.log('Fetching URL:', url);

    // Extract file ID from the URL if it's a Google Drive share link
    let fetchUrl = url;
    const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)\//);
    
    if (fileIdMatch) {
      const fileId = fileIdMatch[1];
      console.log('Extracted file ID:', fileId);
      
      // Try multiple URL formats for better success rate
      const urlsToTry = [
        `https://drive.google.com/uc?export=download&id=${fileId}`,
        `https://drive.google.com/uc?id=${fileId}&export=download`,
        `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`,
        `https://lh3.googleusercontent.com/d/${fileId}=w1000`,
        `https://drive.google.com/file/d/${fileId}/view?usp=drivesdk`,
        url // Original URL as fallback
      ];

      let lastError = null;
      
      for (const tryUrl of urlsToTry) {
        try {
          console.log('Trying URL:', tryUrl);
          
          const response = await fetch(tryUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'image/*,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache',
              'Referer': 'https://drive.google.com/',
              'Sec-Fetch-Dest': 'image',
              'Sec-Fetch-Mode': 'no-cors',
              'Sec-Fetch-Site': 'cross-site'
            },
            redirect: 'follow'
          });

          console.log(`Response for ${tryUrl}:`, {
            status: response.status,
            statusText: response.statusText,
            contentType: response.headers.get('content-type'),
            contentLength: response.headers.get('content-length')
          });

          if (!response.ok) {
            lastError = `${response.status} ${response.statusText}`;
            continue;
          }

          const contentType = response.headers.get('content-type') || 'application/octet-stream';
          
          let arrayBuffer;
          
          // Check if it's an HTML page (Google Drive error page)
          if (contentType.includes('text/html')) {
            const text = await response.text();
            console.log('Got HTML response, checking content...');
            
            // Check for various Google Drive authentication/error indicators
            if (text.includes('Sign in') || 
                text.includes('to continue to Google Drive') ||
                text.includes('Google Drive') && text.includes('authentication') ||
                text.includes('access denied') ||
                text.includes('permission') ||
                text.includes('Google Account') ||
                text.includes('Email or phone')) {
              
              console.log('Detected authentication page, trying next URL...');
              lastError = 'Authentication required - file requires Google Drive sign-in';
              continue;
            }
            
            // If it's HTML but not a Google Drive error, convert back to arrayBuffer
            arrayBuffer = new TextEncoder().encode(text).buffer;
          } else {
            // Get the file data for non-HTML content
            arrayBuffer = await response.arrayBuffer();
          }
          
          if (arrayBuffer.byteLength === 0) {
            console.log('Empty response, trying next URL...');
            lastError = 'Empty response';
            continue;
          }

          console.log('Successfully fetched file:', arrayBuffer.byteLength, 'bytes');

          // Set appropriate headers
          res.setHeader('Content-Type', contentType);
          res.setHeader('Content-Length', arrayBuffer.byteLength);
          res.setHeader('Cache-Control', 'public, max-age=3600');
          
          // Send the file data
          res.send(Buffer.from(arrayBuffer));
          return; // Success! Exit the function

        } catch (error) {
          console.error(`Error with ${tryUrl}:`, error.message);
          lastError = error.message;
          continue;
        }
      }
      
      // If we get here, all URLs failed
      console.error('All URLs failed. Last error:', lastError);
      res.status(404).json({ 
        error: 'Could not fetch file from any URL format',
        details: lastError,
        fileId: fileId,
        originalUrl: url
      });
      
    } else {
      // Direct URL (not a Google Drive share link)
      const response = await fetch(fetchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        console.error('Direct fetch failed:', response.status, response.statusText);
        res.status(response.status).json({ 
          error: `Failed to fetch file: ${response.status} ${response.statusText}` 
        });
        return;
      }

      const contentType = response.headers.get('content-type') || 'application/octet-stream';
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
    }

  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch file', 
      details: error.message 
    });
  }
}
