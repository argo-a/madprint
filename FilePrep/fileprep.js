let csvData = [];
let extractedUrls = [];
let currentJobId = null;
let progressInterval = null;
let jobResults = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('csvFile').addEventListener('change', handleFileUpload);
});

// Handle CSV file upload
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const uploadStatus = document.getElementById('uploadStatus');
    uploadStatus.innerHTML = '<div class="loading"><div class="spinner"></div>Processing CSV file...</div>';

    Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        delimitersToGuess: [',', '\t', '|', ';'],
        complete: function(results) {
            if (results.errors.length > 0) {
                uploadStatus.innerHTML = `<div class="error-message">Error parsing CSV: ${results.errors[0].message}</div>`;
                return;
            }

            // Clean headers by removing whitespace
            const cleanData = results.data.map(row => {
                const cleanRow = {};
                Object.keys(row).forEach(key => {
                    const cleanKey = key.trim();
                    cleanRow[cleanKey] = row[key];
                });
                return cleanRow;
            });

            csvData = cleanData;
            
            // Extract Google Drive URLs
            extractGoogleDriveUrls();
            
            if (extractedUrls.length === 0) {
                uploadStatus.innerHTML = '<div class="error-message">No Google Drive URLs found in the CSV file. Please ensure your CSV has a "notes" column with Google Drive URLs.</div>';
                return;
            }

            uploadStatus.innerHTML = `<div class="success-message">✅ Successfully loaded ${csvData.length} orders and found ${extractedUrls.length} Google Drive files!</div>`;
            
            // Show processing section
            document.getElementById('processingSection').style.display = 'block';
            updateProcessingSummary();
        },
        error: function(error) {
            uploadStatus.innerHTML = `<div class="error-message">Error reading file: ${error.message}</div>`;
        }
    });
}

// Extract Google Drive URLs from CSV data
function extractGoogleDriveUrls() {
    extractedUrls = [];
    
    csvData.forEach((order, orderIndex) => {
        if (order.notes) {
            const urls = extractGoogleDriveUrlsFromText(order.notes);
            urls.forEach((url, urlIndex) => {
                const firstName = order.shipping_address_first_name || '';
                const lastName = order.shipping_address_last_name || '';
                const fullName = `${firstName} ${lastName}`.trim();
                
                extractedUrls.push({
                    url: url,
                    fileId: extractFileId(url),
                    trackingNumber: order.tracking_number || 'N/A',
                    orderNumber: order.number || 'N/A',
                    customerName: fullName || 'Unknown',
                    originalFilename: `order_${order.number || orderIndex}_file_${urlIndex + 1}`,
                    orderIndex: orderIndex,
                    urlIndex: urlIndex
                });
            });
        }
    });
}

// Extract Google Drive URLs from text
function extractGoogleDriveUrlsFromText(text) {
    if (!text) return [];
    
    // Regular expression to match Google Drive URLs
    const driveUrlRegex = /https:\/\/drive\.google\.com\/file\/d\/[a-zA-Z0-9_-]+\/view\?usp=drive_link/g;
    const matches = text.match(driveUrlRegex);
    
    return matches || [];
}

// Extract file ID from Google Drive URL
function extractFileId(driveUrl) {
    const fileIdMatch = driveUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)\//);
    return fileIdMatch ? fileIdMatch[1] : null;
}

// Update processing summary
function updateProcessingSummary() {
    document.getElementById('filesFound').textContent = extractedUrls.length;
    document.getElementById('estimatedSize').textContent = 'Calculating...';
    
    // Enable start button
    document.getElementById('startButton').disabled = false;
    
    // Estimate total size (rough calculation)
    const avgFileSize = 5; // MB average
    const totalEstimatedSize = extractedUrls.length * avgFileSize;
    document.getElementById('estimatedSize').textContent = `~${totalEstimatedSize}MB`;
}

// Start processing files
async function startProcessing() {
    if (extractedUrls.length === 0) {
        alert('No files to process. Please upload a CSV file first.');
        return;
    }

    try {
        // Disable start button
        document.getElementById('startButton').disabled = true;
        document.getElementById('startButton').textContent = '🔄 Starting...';

        // Prepare file data for processing
        const fileData = extractedUrls.map(item => ({
            url: item.url,
            fileId: item.fileId,
            originalFilename: item.originalFilename,
            trackingNumber: item.trackingNumber,
            orderNumber: item.orderNumber,
            customerName: item.customerName
        }));

        // Start the processing job
        const response = await fetch('/api/file-prep-start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fileUrls: fileData
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.success) {
            currentJobId = result.jobId;
            
            // Hide processing section and show progress section
            document.getElementById('processingSection').style.display = 'none';
            document.getElementById('progressSection').style.display = 'block';
            
            // Start monitoring progress
            startProgressMonitoring();
        } else {
            throw new Error(result.error || 'Failed to start processing job');
        }

    } catch (error) {
        console.error('Error starting processing:', error);
        alert(`Error starting file processing: ${error.message}`);
        
        // Re-enable start button
        document.getElementById('startButton').disabled = false;
        document.getElementById('startButton').textContent = '🚀 Start Processing Files';
    }
}

// Start monitoring job progress
function startProgressMonitoring() {
    // Update progress immediately
    updateProgress();
    
    // Set up interval to check progress every 2 seconds
    progressInterval = setInterval(updateProgress, 2000);
}

// Update progress from server
async function updateProgress() {
    if (!currentJobId) return;

    try {
        const response = await fetch(`/api/file-prep-status?jobId=${currentJobId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const status = await response.json();
        
        if (status.success) {
            const progress = status.progress;
            
            // Update progress bar
            const progressPercent = Math.round((progress.processed / progress.total) * 100);
            document.getElementById('progressFill').style.width = `${progressPercent}%`;
            document.getElementById('progressText').textContent = `${progressPercent}% Complete`;
            
            // Update stats
            document.getElementById('processedCount').textContent = progress.processed;
            document.getElementById('totalCount').textContent = progress.total;
            document.getElementById('jobStatus').textContent = progress.status;
            
            // Update current file
            if (progress.currentFile) {
                document.getElementById('currentFile').textContent = `Processing: ${progress.currentFile}`;
            } else if (progress.status === 'completed') {
                document.getElementById('currentFile').textContent = 'All files processed successfully!';
            } else if (progress.status === 'failed') {
                document.getElementById('currentFile').textContent = 'Processing failed. Please try again.';
            }
            
            // Check if job is complete
            if (progress.status === 'completed' || progress.status === 'failed') {
                clearInterval(progressInterval);
                progressInterval = null;
                
                if (progress.status === 'completed') {
                    jobResults = status.results;
                    showResults();
                } else {
                    alert('File processing failed. Please try again.');
                    resetToStart();
                }
            }
        } else {
            throw new Error(status.error || 'Failed to get job status');
        }

    } catch (error) {
        console.error('Error checking progress:', error);
        clearInterval(progressInterval);
        progressInterval = null;
        alert(`Error checking progress: ${error.message}`);
        resetToStart();
    }
}

// Show results section
function showResults() {
    if (!jobResults) return;

    // Hide progress section and show results section
    document.getElementById('progressSection').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'block';
    
    // Update results summary
    const summaryContent = document.getElementById('resultsSummaryContent');
    summaryContent.innerHTML = `
        <div class="summary-item">
            <span class="label">Total Files Processed:</span>
            <span class="value">${jobResults.totalFiles}</span>
        </div>
        <div class="summary-item">
            <span class="label">Successfully Processed:</span>
            <span class="value">${jobResults.successfulFiles}</span>
        </div>
        <div class="summary-item">
            <span class="label">Failed Files:</span>
            <span class="value">${jobResults.failedFiles}</span>
        </div>
        <div class="summary-item">
            <span class="label">Total Size:</span>
            <span class="value">${formatFileSize(jobResults.totalSize || 0)}</span>
        </div>
    `;
    
    // Display files grid
    displayFilesGrid();
}

// Display files in grid format
function displayFilesGrid() {
    if (!jobResults || !jobResults.files) return;

    const filesGridContent = document.getElementById('filesGridContent');
    
    if (jobResults.files.length === 0) {
        filesGridContent.innerHTML = '<div class="error-message">No files were successfully processed.</div>';
        return;
    }

    let html = '';
    jobResults.files.forEach((file, index) => {
        if (file.status === 'success') {
            html += `
                <div class="file-item" data-file-index="${index}">
                    <div class="file-checkbox">
                        <input type="checkbox" id="file_${index}" onchange="updateDownloadButton()">
                        <label for="file_${index}">Select for download</label>
                    </div>
                    
                    <div class="file-preview">
                        <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMiAyMkg0MlY0Mkg0MlYyMkgyMloiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+" alt="File preview" />
                    </div>
                    
                    <div class="file-info">
                        <div class="file-name">${file.originalFilename}</div>
                        <div class="file-details">
                            <div>Order: ${file.orderNumber}</div>
                            <div>Customer: ${file.customerName}</div>
                            <div>Size: ${formatFileSize(file.size || 0)}</div>
                            <div>Status: ✅ Rotated 90°</div>
                        </div>
                    </div>
                    
                    <div class="file-actions">
                        <button class="download-file-button" onclick="downloadSingleFile(${index})">
                            📥 Download
                        </button>
                    </div>
                </div>
            `;
        }
    });
    
    filesGridContent.innerHTML = html;
    updateDownloadButton();
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Update download button state
function updateDownloadButton() {
    const checkboxes = document.querySelectorAll('#filesGridContent input[type="checkbox"]');
    const checkedBoxes = document.querySelectorAll('#filesGridContent input[type="checkbox"]:checked');
    const downloadButton = document.getElementById('downloadSelectedButton');
    
    if (downloadButton) {
        downloadButton.disabled = checkedBoxes.length === 0;
        downloadButton.textContent = `📥 Download Selected (${checkedBoxes.length})`;
    }
}

// Select all files
function selectAllFiles() {
    const checkboxes = document.querySelectorAll('#filesGridContent input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
        checkbox.closest('.file-item').classList.add('selected');
    });
    updateDownloadButton();
}

// Select no files
function selectNoneFiles() {
    const checkboxes = document.querySelectorAll('#filesGridContent input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
        checkbox.closest('.file-item').classList.remove('selected');
    });
    updateDownloadButton();
}

// Download all files
async function downloadAllFiles() {
    if (!jobResults || !jobResults.files) {
        alert('No files available for download.');
        return;
    }

    const successfulFiles = jobResults.files.filter(file => file.status === 'success');
    if (successfulFiles.length === 0) {
        alert('No successfully processed files available for download.');
        return;
    }

    // Create and trigger download for all files
    for (const file of successfulFiles) {
        await downloadFileFromBlob(file.blobUrl, file.processedFilename || file.originalFilename);
        // Small delay between downloads to avoid overwhelming the browser
        await new Promise(resolve => setTimeout(resolve, 500));
    }
}

// Download selected files
async function downloadSelectedFiles() {
    const checkedBoxes = document.querySelectorAll('#filesGridContent input[type="checkbox"]:checked');
    
    if (checkedBoxes.length === 0) {
        alert('Please select files to download.');
        return;
    }

    for (const checkbox of checkedBoxes) {
        const fileIndex = parseInt(checkbox.closest('.file-item').dataset.fileIndex);
        const file = jobResults.files[fileIndex];
        
        if (file && file.status === 'success') {
            await downloadFileFromBlob(file.blobUrl, file.processedFilename || file.originalFilename);
            // Small delay between downloads
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
}

// Download single file
async function downloadSingleFile(fileIndex) {
    const file = jobResults.files[fileIndex];
    
    if (!file || file.status !== 'success') {
        alert('File not available for download.');
        return;
    }

    await downloadFileFromBlob(file.blobUrl, file.processedFilename || file.originalFilename);
}

// Download file from blob URL
async function downloadFileFromBlob(blobUrl, filename) {
    try {
        const response = await fetch(blobUrl);
        const blob = await response.blob();
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
        console.error('Error downloading file:', error);
        alert(`Error downloading file: ${error.message}`);
    }
}

// Start new job
function startNewJob() {
    // Reset all state
    csvData = [];
    extractedUrls = [];
    currentJobId = null;
    jobResults = null;
    
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
    
    // Reset UI
    document.getElementById('csvFile').value = '';
    document.getElementById('uploadStatus').innerHTML = '';
    document.getElementById('processingSection').style.display = 'none';
    document.getElementById('progressSection').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'none';
    
    // Reset start button
    document.getElementById('startButton').disabled = true;
    document.getElementById('startButton').textContent = '🚀 Start Processing Files';
}

// Reset to start state
function resetToStart() {
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
    
    document.getElementById('progressSection').style.display = 'none';
    document.getElementById('processingSection').style.display = 'block';
    
    // Reset start button
    document.getElementById('startButton').disabled = false;
    document.getElementById('startButton').textContent = '🚀 Start Processing Files';
}

// Add event listeners for file selection
document.addEventListener('change', function(e) {
    if (e.target.type === 'checkbox' && e.target.closest('.file-item')) {
        const fileItem = e.target.closest('.file-item');
        if (e.target.checked) {
            fileItem.classList.add('selected');
        } else {
            fileItem.classList.remove('selected');
        }
    }
});
