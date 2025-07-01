// Background service worker for Google Drive CORS bypass
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchGoogleDriveFile') {
    fetchGoogleDriveFile(request.fileId, request.originalUrl)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'checkExtensionStatus') {
    sendResponse({ success: true, extensionActive: true });
    return true;
  }
});

async function fetchGoogleDriveFile(fileId, originalUrl) {
  try {
    console.log(`Fetching Google Drive file: ${fileId}`);
    
    // Try authenticated URLs first (these work when user is logged in)
    const authenticatedUrls = [
      `https://drive.usercontent.google.com/u/6/uc?id=${fileId}&export=download`,
      `https://drive.usercontent.google.com/u/0/uc?id=${fileId}&export=download`,
      `https://drive.google.com/uc?export=download&id=${fileId}&authuser=0`,
      `https://drive.google.com/uc?export=download&id=${fileId}&authuser=6`,
      `https://drive.google.com/uc?id=${fileId}&export=download&authuser=0`,
      `https://drive.google.com/uc?id=${fileId}&export=download&authuser=6`
    ];
    
    // Then try public URLs as fallback
    const publicUrls = [
      `https://lh3.googleusercontent.com/d/${fileId}=w2000`,
      `https://drive.google.com/thumbnail?id=${fileId}&sz=w2000`,
      `https://docs.google.com/uc?export=download&id=${fileId}`
    ];
    
    const allUrls = [...authenticatedUrls, ...publicUrls];
    let lastError = null;
    
    for (const url of allUrls) {
      try {
        console.log(`Trying to fetch: ${url}`);
        
        const response = await fetch(url, {
          method: 'GET',
          credentials: 'include', // Include cookies for authentication
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });

        console.log(`Response status: ${response.status}, Content-Type: ${response.headers.get('content-type')}`);

        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          
          // Check if it's a redirect page or error page
          if (contentType.includes('text/html')) {
            const text = await response.text();
            if (text.includes('Google Drive') || text.includes('Sign in') || text.includes('download')) {
              console.log('Received HTML page instead of file, trying next URL');
              continue;
            }
            // If it's HTML but doesn't look like a Google page, it might be the actual content
          }
          
          // Check for very small responses that might be errors
          const contentLength = response.headers.get('content-length');
          if (contentLength && parseInt(contentLength) < 100) {
            console.log('Response too small, likely an error');
            continue;
          }
          
          const arrayBuffer = await response.arrayBuffer();
          
          // Check if we got actual file content
          if (arrayBuffer.byteLength < 100) {
            console.log('File too small, likely an error response');
            continue;
          }
          
          const base64 = arrayBufferToBase64(arrayBuffer);
          
          // Determine file type
          let mimeType = contentType;
          if (!mimeType || mimeType === 'application/octet-stream' || mimeType.includes('text/html')) {
            // Try to determine from content
            if (isImageContent(arrayBuffer)) {
              mimeType = 'image/jpeg'; // Default to JPEG for images
            } else if (isPDFContent(arrayBuffer)) {
              mimeType = 'application/pdf';
            } else {
              mimeType = 'application/octet-stream';
            }
          }
          
          console.log(`Successfully downloaded file: ${arrayBuffer.byteLength} bytes, type: ${mimeType}`);
          
          return {
            success: true,
            data: base64,
            mimeType: mimeType,
            size: arrayBuffer.byteLength,
            url: url
          };
        } else if (response.status === 403) {
          lastError = 'Access denied - file may not be publicly accessible or you may not have permission';
          console.log(`Access denied (403) for ${url}`);
        } else if (response.status === 404) {
          lastError = 'File not found - the file may have been deleted or the ID is incorrect';
          console.log(`File not found (404) for ${url}`);
        } else {
          lastError = `HTTP ${response.status}: ${response.statusText}`;
          console.log(`Failed with status ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        lastError = error.message;
        console.log(`Error fetching ${url}:`, error);
        continue;
      }
    }
    
    throw new Error(`All download attempts failed. Last error: ${lastError}`);
    
  } catch (error) {
    console.error('fetchGoogleDriveFile error:', error);
    return {
      success: false,
      error: error.message,
      originalUrl: originalUrl
    };
  }
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function isImageContent(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  
  // Check for common image file signatures
  // JPEG
  if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xD8) return true;
  // PNG
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return true;
  // GIF
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return true;
  // WebP
  if (bytes.length >= 12 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return true;
  
  return false;
}

function isPDFContent(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  // Check for PDF signature
  if (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return true;
  }
  return false;
}

// Set extension badge to indicate it's active
chrome.action.setBadgeText({ text: 'ON' });
chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });

console.log('Google Drive CORS Bypass extension loaded');
