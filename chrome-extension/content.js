// Content script for Google Drive CORS bypass
(function() {
  'use strict';
  
  console.log('Google Drive CORS Bypass content script starting...');
  console.log('Current URL:', window.location.href);
  console.log('Document ready state:', document.readyState);
  
  // Check if we're on a page that might use Google Drive files
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeExtension);
  } else {
    initializeExtension();
  }
  
  function initializeExtension() {
    // Inject extension API into the page
    const script = document.createElement('script');
    script.textContent = `
      (function() {
        // Create global extension interface
        window.GoogleDriveCORSBypass = {
          isExtensionActive: false,
          
          // Check if extension is available
          checkExtension: function() {
            return new Promise((resolve) => {
              window.postMessage({
                type: 'GDCB_CHECK_EXTENSION',
                source: 'page'
              }, '*');
              
              // Set timeout for response
              setTimeout(() => {
                if (!this.isExtensionActive) {
                  resolve(false);
                }
              }, 1000);
            });
          },
          
          // Fetch Google Drive file through extension
          fetchFile: function(fileId, originalUrl) {
            return new Promise((resolve, reject) => {
              if (!this.isExtensionActive) {
                reject(new Error('Extension not available'));
                return;
              }
              
              const messageId = 'gdcb_' + Date.now() + '_' + Math.random();
              
              // Listen for response
              const responseHandler = (event) => {
                if (event.data.type === 'GDCB_FETCH_RESPONSE' && event.data.messageId === messageId) {
                  window.removeEventListener('message', responseHandler);
                  if (event.data.success) {
                    resolve(event.data.result);
                  } else {
                    reject(new Error(event.data.error));
                  }
                }
              };
              
              window.addEventListener('message', responseHandler);
              
              // Send request
              window.postMessage({
                type: 'GDCB_FETCH_FILE',
                source: 'page',
                messageId: messageId,
                fileId: fileId,
                originalUrl: originalUrl
              }, '*');
              
              // Timeout after 30 seconds
              setTimeout(() => {
                window.removeEventListener('message', responseHandler);
                reject(new Error('Request timeout'));
              }, 30000);
            });
          }
        };
        
        // Auto-check extension on load
        window.GoogleDriveCORSBypass.checkExtension().then((active) => {
          if (active) {
            console.log('Google Drive CORS Bypass extension is active');
            // Dispatch custom event to notify the page
            window.dispatchEvent(new CustomEvent('googleDriveCORSBypassReady', {
              detail: { extensionActive: true }
            }));
          }
        });
      })();
    `;
    
    (document.head || document.documentElement).appendChild(script);
    script.remove();
    
    // Listen for messages from the injected script
    window.addEventListener('message', handlePageMessage);
  }
  
  function handlePageMessage(event) {
    if (event.source !== window) return;
    
    const { type, source } = event.data;
    if (source !== 'page') return;
    
    switch (type) {
      case 'GDCB_CHECK_EXTENSION':
        // Respond that extension is active
        chrome.runtime.sendMessage({ action: 'checkExtensionStatus' }, (response) => {
          console.log('Extension status check response:', response);
          if (response && response.success) {
            window.postMessage({
              type: 'GDCB_EXTENSION_STATUS',
              source: 'content',
              active: true
            }, '*');
            
            // Update the injected script
            const script = document.createElement('script');
            script.textContent = `
              if (window.GoogleDriveCORSBypass) {
                window.GoogleDriveCORSBypass.isExtensionActive = true;
                console.log('Google Drive CORS Bypass extension is now active');
              }
            `;
            (document.head || document.documentElement).appendChild(script);
            script.remove();
          } else {
            console.log('Extension status check failed');
          }
        });
        break;
        
      case 'GDCB_FETCH_FILE':
        const { messageId, fileId, originalUrl } = event.data;
        
        // Forward request to background script
        chrome.runtime.sendMessage({
          action: 'fetchGoogleDriveFile',
          fileId: fileId,
          originalUrl: originalUrl
        }, (response) => {
          // Send response back to page
          window.postMessage({
            type: 'GDCB_FETCH_RESPONSE',
            source: 'content',
            messageId: messageId,
            success: response.success,
            result: response.success ? response : null,
            error: response.success ? null : response.error
          }, '*');
        });
        break;
    }
  }
  
  console.log('Google Drive CORS Bypass content script loaded');
})();
