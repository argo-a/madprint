let csvData = [];
let scannedItems = [];
let analysisResults = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('csvFile').addEventListener('change', handleFileUpload);
    document.getElementById('trackingInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addScannedItem();
        }
    });
    
    // Auto-submit on input (for barcode scanners that don't send Enter)
    document.getElementById('trackingInput').addEventListener('input', function(e) {
        const value = e.target.value.trim();
        // Auto-submit if input looks like a complete tracking number (>10 chars)
        if (value.length > 10) {
            setTimeout(() => {
                if (document.getElementById('trackingInput').value.trim() === value) {
                    addScannedItem();
                }
            }, 500); // Small delay to ensure complete scan
        }
    });
});

// Smart barcode processing function (copied from main app)
function processTrackingNumber(rawInput) {
    const trimmedInput = rawInput.trim();
    
    // Rule 1: If starts with 1Z (UPS), always use full value
    if (trimmedInput.startsWith('1Z')) {
        return {
            processed: trimmedInput,
            action: 'kept_full',
            original: rawInput,
            removed: null
        };
    }
    
    // Rule 2: If very long (likely has prefix), remove first 8 digits
    if (trimmedInput.length > 20) {
        const processed = trimmedInput.substring(8);
        const removed = trimmedInput.substring(0, 8);
        return {
            processed: processed,
            action: 'removed_prefix',
            original: rawInput,
            removed: removed
        };
    }
    
    // Rule 3: Otherwise use as-is
    return {
        processed: trimmedInput,
        action: 'kept_as_is',
        original: rawInput,
        removed: null
    };
}

function showBarcodeInfo(processingResult) {
    const barcodeInfo = document.getElementById('barcodeInfo');
    const barcodeDetails = document.getElementById('barcodeDetails');
    
    if (processingResult.action === 'removed_prefix') {
        barcodeDetails.innerHTML = `Removed prefix "${processingResult.removed}" from scanned barcode. Using: ${processingResult.processed}`;
        barcodeInfo.classList.add('show');
    } else if (processingResult.action === 'kept_full') {
        barcodeDetails.innerHTML = `UPS tracking detected (1Z prefix) - using full scanned value: ${processingResult.processed}`;
        barcodeInfo.classList.add('show');
    } else {
        barcodeInfo.classList.remove('show');
    }
}

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
            
            // Validate that tracking_number column exists
            if (csvData.length === 0) {
                uploadStatus.innerHTML = '<div class="error-message">CSV file is empty</div>';
                return;
            }

            const firstRow = csvData[0];
            if (!('tracking_number' in firstRow)) {
                uploadStatus.innerHTML = '<div class="error-message">CSV file must contain a "tracking_number" column</div>';
                return;
            }

            // Filter out rows without tracking numbers
            csvData = csvData.filter(row => row.tracking_number && row.tracking_number.toString().trim());

            uploadStatus.innerHTML = `<div class="success-message">✅ Successfully loaded ${csvData.length} tracking numbers!</div>`;
            
            // Show scanning section
            document.getElementById('scanningSection').style.display = 'block';
            
            // Reset scanned items and results
            scannedItems = [];
            analysisResults = null;
            updateScannedItemsDisplay();
            document.getElementById('resultsSection').style.display = 'none';
        },
        error: function(error) {
            uploadStatus.innerHTML = `<div class="error-message">Error reading file: ${error.message}</div>`;
        }
    });
}

// Add scanned item
function addScannedItem() {
    const rawInput = document.getElementById('trackingInput').value;
    
    if (!rawInput.trim()) {
        return;
    }

    // Process the tracking number with smart barcode logic
    const processingResult = processTrackingNumber(rawInput);
    const trackingNumber = processingResult.processed;
    
    // Show barcode processing info
    showBarcodeInfo(processingResult);
    
    // Check if already scanned
    const existingIndex = scannedItems.findIndex(item => item.processed === trackingNumber);
    if (existingIndex !== -1) {
        // Update existing item instead of adding duplicate
        scannedItems[existingIndex] = {
            processed: trackingNumber,
            original: rawInput,
            processingResult: processingResult,
            timestamp: new Date()
        };
    } else {
        // Add new item
        scannedItems.push({
            processed: trackingNumber,
            original: rawInput,
            processingResult: processingResult,
            timestamp: new Date()
        });
    }
    
    // Clear the input field for next scan
    document.getElementById('trackingInput').value = '';
    
    // Update display
    updateScannedItemsDisplay();
    updateAnalyzeButton();
}

// Update scanned items display
function updateScannedItemsDisplay() {
    const scannedItemsList = document.getElementById('scannedItemsList');
    const scanCount = document.getElementById('scanCount');
    
    scanCount.textContent = `${scannedItems.length} items scanned`;
    
    if (scannedItems.length === 0) {
        scannedItemsList.innerHTML = '<div class="no-items">No items scanned yet</div>';
        return;
    }
    
    let html = '';
    scannedItems.forEach((item, index) => {
        const showDetails = item.processingResult.action !== 'kept_as_is';
        html += `
            <div class="scanned-item">
                <div class="scanned-item-info">
                    <div class="scanned-item-main">${item.processed}</div>
                    ${showDetails ? `<div class="scanned-item-details">Original: ${item.original}</div>` : ''}
                </div>
                <button class="remove-item-button" onclick="removeScannedItem(${index})">×</button>
            </div>
        `;
    });
    
    scannedItemsList.innerHTML = html;
}

// Remove individual scanned item
function removeScannedItem(index) {
    scannedItems.splice(index, 1);
    updateScannedItemsDisplay();
    updateAnalyzeButton();
}

// Clear all scanned items
function clearAllScanned() {
    scannedItems = [];
    updateScannedItemsDisplay();
    updateAnalyzeButton();
    document.getElementById('barcodeInfo').classList.remove('show');
    document.getElementById('resultsSection').style.display = 'none';
}

// Update analyze button state
function updateAnalyzeButton() {
    const analyzeButton = document.getElementById('analyzeButton');
    analyzeButton.disabled = scannedItems.length === 0;
}

// Run analysis
function runAnalysis() {
    if (scannedItems.length === 0 || csvData.length === 0) {
        return;
    }

    // Get all tracking numbers from CSV (processed through same logic)
    const csvTrackingNumbers = csvData.map(row => {
        const rawTracking = row.tracking_number.toString().trim();
        return processTrackingNumber(rawTracking).processed;
    });

    // Get all scanned tracking numbers
    const scannedTrackingNumbers = scannedItems.map(item => item.processed);

    // Find duplicates (in both CSV and scanned)
    const duplicates = scannedTrackingNumbers.filter(tracking => 
        csvTrackingNumbers.includes(tracking)
    );

    // Find missing (in CSV but not scanned)
    const missing = csvTrackingNumbers.filter(tracking => 
        !scannedTrackingNumbers.includes(tracking)
    );

    // Find extra (scanned but not in CSV)
    const extra = scannedTrackingNumbers.filter(tracking => 
        !csvTrackingNumbers.includes(tracking)
    );

    // Remove duplicates from arrays
    const uniqueDuplicates = [...new Set(duplicates)];
    const uniqueMissing = [...new Set(missing)];
    const uniqueExtra = [...new Set(extra)];

    analysisResults = {
        duplicates: uniqueDuplicates,
        missing: uniqueMissing,
        extra: uniqueExtra,
        totalScanned: scannedItems.length,
        totalInCSV: csvData.length,
        uniqueInCSV: csvTrackingNumbers.length
    };

    displayResults();
}

// Display analysis results
function displayResults() {
    if (!analysisResults) return;

    const resultsSection = document.getElementById('resultsSection');
    const summaryContent = document.getElementById('summaryContent');

    // Display summary
    summaryContent.innerHTML = `
        <div class="summary-stats">
            <div class="stat-item">
                <div class="stat-value">${analysisResults.totalScanned}</div>
                <div class="stat-label">Items Scanned</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${analysisResults.uniqueInCSV}</div>
                <div class="stat-label">Items in CSV</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${analysisResults.duplicates.length}</div>
                <div class="stat-label">Duplicates Found</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${analysisResults.missing.length}</div>
                <div class="stat-label">Missing Packages</div>
            </div>
        </div>
    `;

    // Display detailed results in tabs
    displayDuplicates();
    displayMissing();
    displayExtra();

    resultsSection.style.display = 'block';
}

// Display duplicates tab
function displayDuplicates() {
    const duplicatesContent = document.getElementById('duplicatesContent');
    
    if (analysisResults.duplicates.length === 0) {
        duplicatesContent.innerHTML = '<div class="no-results">No duplicate tracking numbers found</div>';
        return;
    }

    let html = '<div class="results-list">';
    analysisResults.duplicates.forEach(tracking => {
        // Find the corresponding CSV row to get name information
        const csvRow = csvData.find(row => {
            const rawTracking = row.tracking_number.toString().trim();
            const processedTracking = processTrackingNumber(rawTracking).processed;
            return processedTracking === tracking;
        });
        
        const firstName = csvRow?.shipping_address_first_name || '';
        const lastName = csvRow?.shipping_address_last_name || '';
        const fullName = `${firstName} ${lastName}`.trim();
        
        html += `
            <div class="result-item duplicate">
                <div class="result-info">
                    <div class="result-tracking">${tracking}</div>
                    ${fullName ? `<div class="result-name">${fullName}</div>` : ''}
                </div>
                <div class="result-status status-duplicate">DUPLICATE</div>
            </div>
        `;
    });
    html += '</div>';
    
    duplicatesContent.innerHTML = html;
}

// Display missing tab
function displayMissing() {
    const missingContent = document.getElementById('missingContent');
    
    if (analysisResults.missing.length === 0) {
        missingContent.innerHTML = '<div class="no-results">All packages from CSV have been scanned</div>';
        return;
    }

    let html = '<div class="results-list">';
    analysisResults.missing.forEach(tracking => {
        html += `
            <div class="result-item missing">
                <div class="result-tracking">${tracking}</div>
                <div class="result-status status-missing">MISSING</div>
            </div>
        `;
    });
    html += '</div>';
    
    missingContent.innerHTML = html;
}

// Display extra tab
function displayExtra() {
    const extraContent = document.getElementById('extraContent');
    
    if (analysisResults.extra.length === 0) {
        extraContent.innerHTML = '<div class="no-results">No extra items scanned (all scanned items are in CSV)</div>';
        return;
    }

    let html = '<div class="results-list">';
    analysisResults.extra.forEach(tracking => {
        html += `
            <div class="result-item extra">
                <div class="result-tracking">${tracking}</div>
                <div class="result-status status-extra">EXTRA</div>
            </div>
        `;
    });
    html += '</div>';
    
    extraContent.innerHTML = html;
}

// Show specific tab
function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName + 'Tab').classList.add('active');
    
    // Add active class to clicked button
    event.target.classList.add('active');
}

// Download results as Excel
function downloadResults() {
    if (!analysisResults) {
        alert('No analysis results to download. Please run analysis first.');
        return;
    }

    // Prepare data for Excel
    const excelData = [
        ['Duplicator Analysis Results'],
        ['Generated on:', new Date().toLocaleDateString()],
        [''],
        ['SUMMARY'],
        ['Items Scanned:', analysisResults.totalScanned],
        ['Items in CSV:', analysisResults.uniqueInCSV],
        ['Duplicates Found:', analysisResults.duplicates.length],
        ['Missing Packages:', analysisResults.missing.length],
        ['Extra Scanned:', analysisResults.extra.length],
        [''],
        ['DUPLICATES (Found in both CSV and scanned)']
    ];

    // Add duplicates
    if (analysisResults.duplicates.length > 0) {
        excelData.push(['Tracking Number', 'Status']);
        analysisResults.duplicates.forEach(tracking => {
            excelData.push([tracking, 'DUPLICATE']);
        });
    } else {
        excelData.push(['No duplicates found']);
    }

    excelData.push(['']);
    excelData.push(['MISSING PACKAGES (In CSV but not scanned)']);

    // Add missing
    if (analysisResults.missing.length > 0) {
        excelData.push(['Tracking Number', 'Status']);
        analysisResults.missing.forEach(tracking => {
            excelData.push([tracking, 'MISSING']);
        });
    } else {
        excelData.push(['All packages scanned']);
    }

    excelData.push(['']);
    excelData.push(['EXTRA SCANNED (Scanned but not in CSV)']);

    // Add extra
    if (analysisResults.extra.length > 0) {
        excelData.push(['Tracking Number', 'Status']);
        analysisResults.extra.forEach(tracking => {
            excelData.push([tracking, 'EXTRA']);
        });
    } else {
        excelData.push(['No extra items scanned']);
    }

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Analysis Results');
    
    // Generate filename with current date
    const today = new Date();
    const filename = `Duplicator_Analysis_${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}.xlsx`;
    
    // Download file
    XLSX.writeFile(wb, filename);
}
