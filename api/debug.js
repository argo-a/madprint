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

  const { url } = req.query;

  if (!url) {
    res.status(400).json({ error: 'URL parameter is required' });
    return;
  }

  try {
    console.log('Debug - Testing URL:', url);

    // Extract file ID from the URL if it's a Google Drive share link
    const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)\//);
    
    if (!fileIdMatch) {
      return res.json({
        success: false,
        error: 'Could not extract file ID from URL',
        url: url,
        pattern: 'Expected format: https://drive.google.com/file/d/FILE_ID/view?usp=drive_link'
      });
    }

    const fileId = fileIdMatch[1];
    console.log('Debug - Extracted file ID:', fileId);
    
    // Test multiple URL formats
    const urlsToTest = [
      {
        name: 'Direct Download',
        url: `https://drive.google.com/uc?export=download&id=${fileId}`
      },
      {
        name: 'Alternative Download',
        url: `https://drive.google.com/uc?id=${fileId}&export=download`
      },
      {
        name: 'Thumbnail',
        url: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`
      },
      {
        name: 'Google User Content',
        url: `https://lh3.googleusercontent.com/d/${fileId}=w1000`
      },
      {
        name: 'View Link',
        url: `https://drive.google.com/file/d/${fileId}/view?usp=drivesdk`
      },
      {
        name: 'Original URL',
        url: url
      }
    ];

    const results = [];
    
    for (const testUrl of urlsToTest) {
      try {
        console.log(`Debug - Testing ${testUrl.name}:`, testUrl.url);
        
        const response = await fetch(testUrl.url, {
          method: 'HEAD', // Just get headers, not the full content
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'image/*,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://drive.google.com/'
          },
          redirect: 'manual' // Don't follow redirects automatically
        });

        const result = {
          name: testUrl.name,
          url: testUrl.url,
          status: response.status,
          statusText: response.statusText,
          contentType: response.headers.get('content-type'),
          contentLength: response.headers.get('content-length'),
          location: response.headers.get('location'),
          success: response.ok || response.status === 302 || response.status === 301
        };

        results.push(result);
        console.log(`Debug - Result for ${testUrl.name}:`, result);

      } catch (error) {
        results.push({
          name: testUrl.name,
          url: testUrl.url,
          error: error.message,
          success: false
        });
        console.error(`Debug - Error testing ${testUrl.name}:`, error.message);
      }
    }

    // Check if file is publicly accessible by testing the share link
    let shareAccessible = false;
    try {
      const shareResponse = await fetch(url, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      shareAccessible = shareResponse.ok;
    } catch (error) {
      shareAccessible = false;
    }

    const summary = {
      fileId: fileId,
      originalUrl: url,
      shareAccessible: shareAccessible,
      workingUrls: results.filter(r => r.success).length,
      totalTested: results.length,
      recommendations: []
    };

    // Add recommendations based on results
    if (summary.workingUrls === 0) {
      summary.recommendations.push('File may not be publicly accessible. Check Google Drive sharing settings.');
      summary.recommendations.push('Make sure the file is set to "Anyone with the link can view".');
    }

    if (!shareAccessible) {
      summary.recommendations.push('Original share link is not accessible. Verify the URL is correct.');
    }

    const workingResults = results.filter(r => r.success);
    if (workingResults.length > 0) {
      summary.recommendations.push(`Try using: ${workingResults[0].name} (${workingResults[0].url})`);
    }

    res.json({
      success: true,
      summary: summary,
      results: results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Debug failed', 
      details: error.message 
    });
  }
}
