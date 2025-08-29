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
    // Try multiple Google Drive URL formats
    const urlsToTry = [
      `https://drive.google.com/uc?export=download&id=${fileId}`,
      `https://drive.google.com/uc?id=${fileId}&export=download`,
      `https://lh3.googleusercontent.com/d/${fileId}=w2000`,
      `https://drive.google.com/thumbnail?id=${fileId}&sz=w2000`,
      `https://docs.google.com/uc?export=download&id=${fileId}`
    ];

    let lastError = null;
    
    for (const url of urlsToTry) {
      try {
        console.log(`Trying to fetch: ${url}`);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });

        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          console.log(`Success! Content-Type: ${contentType}`);
          
          // Check if it's a redirect page (Google Drive sometimes returns HTML instead of the file)
          if (contentType.includes('text/html')) {
            const text = await response.text();
            if (text.includes('Google Drive') && text.includes('download')) {
              // This is likely a download page, not the actual file
              continue;
            }
          }
          
          const arrayBuffer = await response.arrayBuffer();
          const base64 = arrayBufferToBase64(arrayBuffer);
          
          // Determine file type
          let mimeType = contentType;
          if (!mimeType || mimeType === 'application/octet-stream') {
            // Try to determine from content
            if (isImageContent(arrayBuffer)) {
              mimeType = 'image/jpeg'; // Default to JPEG for images
            } else if (isPDFContent(arrayBuffer)) {
              mimeType = 'application/pdf';
            } else {
              mimeType = 'application/octet-stream';
            }
          }
          
          return {
            success: true,
            data: base64,
            mimeType: mimeType,
            size: arrayBuffer.byteLength,
            url: url
          };
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
