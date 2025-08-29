# MaddPrints App Suite - Technical Documentation

This document provides detailed technical information about the MaddPrints App Suite architecture, logic, and implementation details for rebuilding or maintaining the application.

## 🏗️ Architecture Overview

The MaddPrints App Suite is a client-side web application with server-side CORS bypass functionality. It consists of four main modules that share common libraries and design patterns.

### Core Technologies
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **CSV Processing**: PapaParse library (v5.4.1)
- **Excel Processing**: SheetJS (xlsx v0.18.5)
- **Storage**: Browser LocalStorage
- **Deployment**: Vercel with serverless functions

## 📋 Module-by-Module Technical Breakdown

### 1. Main App (index.html) - v2.4

#### Purpose
Tracking number search and Google Drive file display with embedded previews.

#### Key Functions
```javascript
// Core search functionality
function searchTracking() {
    const trackingNumber = document.getElementById('trackingInput').value.trim();
    // Searches through csvData array for matching tracking numbers
    // Displays results with embedded Google Drive previews
}

// CSV processing
function processCSV() {
    // Uses PapaParse to convert CSV to JSON
    // Extracts Google Drive URLs from 'notes' field
    // Stores data in global csvData variable
}

// Google Drive URL handling
function extractGoogleDriveUrls(notes) {
    // Regex: /https:\/\/drive\.google\.com\/file\/d\/[a-zA-Z0-9_-]+\/view\?usp=drive_link/g
    // Extracts all Google Drive URLs from notes field
}
```

#### URL Logic
- **Input Format**: `https://drive.google.com/file/d/FILE_ID/view?usp=drive_link`
- **Preview Format**: `https://drive.google.com/file/d/FILE_ID/preview`
- **Download Format**: `https://drive.usercontent.google.com/u/3/uc?id=FILE_ID&export=download`

#### Data Flow
1. User uploads CSV file
2. PapaParse converts to JSON array
3. Data stored in `csvData` global variable
4. Search function filters by tracking number
5. Results displayed with embedded iframes

#### LocalStorage Usage
```javascript
// File upload history
localStorage.setItem('uploadHistory', JSON.stringify(historyArray));

// CSV data persistence
localStorage.setItem('csvData', JSON.stringify(csvData));
```

### 2. View URLs (view-urls.html)

#### Purpose
Comprehensive file manager with multi-select, view toggles, and bulk operations.

#### Key Functions
```javascript
// View switching
function switchView(view) {
    // Toggles between 'grid' and 'list' views
    // Updates CSS classes and button states
}

// Multi-select functionality
function toggleFileSelection(fileKey, isSelected) {
    // Manages selectedFiles Set
    // Updates UI checkboxes and row highlighting
}

// Sorting functionality
function sortAndDisplay() {
    // Sorts by ship date (newest/oldest)
    // Re-renders both grid and list views
}

// Bulk download
function downloadSelected() {
    // Opens multiple download URLs with staggered timing
    // 500ms delay between downloads to prevent browser blocking
}
```

#### Data Structures
```javascript
// Global variables
let currentView = 'grid';           // Current view mode
let selectedFiles = new Set();      // Selected file keys
let allUrlsData = [];              // All URL data for view switching

// File key format
const fileKey = `${trackingNumber}-${fileId}`;
```

#### View Toggle Logic
- **Grid View**: CSS Grid layout with cards
- **List View**: HTML table with compact rows
- **Switching**: JavaScript toggles CSS classes and visibility

### 3. MaddInvoice (MaddInvoice/index.html) - v1.7

#### Purpose
Monthly invoice generation from production order data.

#### Key Functions
```javascript
// File processing (Excel/CSV)
function handleFileUpload(event) {
    // Detects file type (.csv, .xlsx, .xls)
    // Uses appropriate parser (PapaParse or SheetJS)
}

// Month filtering
function generateInvoice() {
    // Filters orders by selected month
    // Calculates totals and summaries
    // Generates downloadable Excel report
}

// Excel export
function downloadExcel() {
    // Uses SheetJS to create Excel workbook
    // Multiple sheets: Summary, Details
    // Triggers download with proper filename
}
```

#### Data Processing Logic
```javascript
// Month filtering logic
const selectedMonth = parseInt(document.getElementById('monthSelect').value);
const filteredOrders = allOrders.filter(order => {
    const orderDate = new Date(order.order_date);
    return orderDate.getMonth() === selectedMonth && orderDate.getFullYear() === 2025;
});
```

#### Excel Generation
- **Library**: SheetJS (xlsx)
- **Format**: Multi-sheet workbook
- **Sheets**: Summary, Order Details
- **Download**: Blob URL with automatic download

### 4. Duplicator (Duplicator/index.html) - v1.2

#### Purpose
Package scanning and duplicate detection with smart barcode processing.

#### Key Functions
```javascript
// Smart barcode processing
function processBarcode(input) {
    // Handles UPS 1Z prefix detection
    // Removes long number prefixes
    // Returns cleaned tracking number
}

// Auto-submit functionality
function handleBarcodeInput() {
    // Automatically submits after barcode scan
    // No manual "Add Item" button required
    // Updates scanned items list in real-time
}

// Duplicate analysis
function runAnalysis() {
    // Compares scanned items with CSV data
    // Identifies: duplicates, missing, extra items
    // Generates comprehensive report
}
```

#### Barcode Processing Logic
```javascript
// UPS tracking number detection
if (input.startsWith('1Z')) {
    // UPS tracking number - use as-is
    return input;
}

// Long number prefix removal
if (input.length > 15) {
    // Extract last 10-15 characters
    return input.slice(-12);
}
```

#### Analysis Algorithm
```javascript
// Duplicate detection
const duplicates = scannedItems.filter((item, index) => 
    scannedItems.indexOf(item) !== index
);

// Missing packages (in CSV but not scanned)
const missing = csvTrackingNumbers.filter(tracking => 
    !scannedItems.includes(tracking)
);

// Extra scanned (scanned but not in CSV)
const extra = scannedItems.filter(tracking => 
    !csvTrackingNumbers.includes(tracking)
);
```

## 🔗 Google Drive URL Handling

### URL Transformation Logic
```javascript
// Extract file ID from Google Drive URL
function extractFileId(driveUrl) {
    const fileIdMatch = driveUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)\//);
    return fileIdMatch ? fileIdMatch[1] : null;
}

// Generate different URL formats
const fileId = extractFileId(originalUrl);
const previewUrl = `https://drive.google.com/file/d/${fileId}/preview`;
const downloadUrl = `https://drive.usercontent.google.com/u/3/uc?id=${fileId}&export=download`;
```

### CORS Bypass Implementation
```javascript
// Server-side proxy (api/proxy.js)
export default async function handler(req, res) {
    const { url } = req.query;
    
    // Validate Google Drive URL
    if (!url || !url.includes('drive.google.com')) {
        return res.status(400).json({ error: 'Invalid URL' });
    }
    
    // Fetch file server-side (no CORS restrictions)
    const response = await fetch(url);
    const data = await response.buffer();
    
    // Return file data to client
    res.setHeader('Content-Type', response.headers.get('content-type'));
    res.send(data);
}
```

## 💾 Data Storage Patterns

### LocalStorage Structure
```javascript
// Upload history
{
    "uploadHistory": [
        {
            "filename": "orders.csv",
            "timestamp": "2025-08-29T20:45:00.000Z",
            "recordCount": 150
        }
    ]
}

// CSV data cache
{
    "csvData": [
        {
            "tracking_number": "1Z123456789",
            "notes": "https://drive.google.com/file/d/...",
            "shipped_at": "2025-08-29",
            "number": "ORD001",
            "shipping_address_first_name": "John",
            "shipping_address_last_name": "Doe"
        }
    ]
}

// Google Drive URLs cache
{
    "googleDriveUrls": [
        {
            "trackingNumber": "1Z123456789",
            "orderNumber": "ORD001",
            "customerName": "John Doe",
            "shippedAt": "2025-08-29",
            "url": "https://drive.google.com/file/d/.../view?usp=drive_link",
            "fileId": "FILE_ID_HERE"
        }
    ]
}
```

## 🎨 CSS Architecture

### Design System
```css
/* Color Palette */
:root {
    --primary-color: #667eea;
    --secondary-color: #764ba2;
    --success-color: #28a745;
    --danger-color: #dc3545;
    --warning-color: #ffc107;
    --info-color: #17a2b8;
}

/* Component Patterns */
.btn {
    /* Base button styling */
    padding: 8px 16px;
    border-radius: 20px;
    border: none;
    cursor: pointer;
    transition: all 0.3s ease;
}

.card {
    /* Base card styling */
    background: white;
    border-radius: 10px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    padding: 20px;
}
```

### Responsive Breakpoints
```css
/* Mobile First Approach */
@media (max-width: 768px) {
    /* Mobile styles */
}

@media (min-width: 769px) and (max-width: 1024px) {
    /* Tablet styles */
}

@media (min-width: 1025px) {
    /* Desktop styles */
}
```

## 🔄 State Management

### Global Variables Pattern
```javascript
// Each module maintains its own global state
let csvData = [];              // Main data array
let currentView = 'grid';      // UI state
let selectedFiles = new Set(); // Selection state
let isLoading = false;         // Loading state
```

### Event Handling
```javascript
// File upload handling
document.getElementById('csvFile').addEventListener('change', handleFileUpload);

// Search functionality
document.getElementById('searchInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        searchTracking();
    }
});

// Auto-submit for barcode scanning
document.getElementById('trackingInput').addEventListener('input', function(e) {
    // Auto-submit logic for barcode scanners
    if (e.target.value.length >= 10) {
        setTimeout(() => addScannedItem(), 100);
    }
});
```

## 🚀 Deployment Configuration

### Vercel Configuration (vercel.json)
```json
{
    "functions": {
        "api/proxy.js": {
            "maxDuration": 30
        }
    },
    "headers": [
        {
            "source": "/api/(.*)",
            "headers": [
                {
                    "key": "Access-Control-Allow-Origin",
                    "value": "*"
                }
            ]
        }
    ]
}
```

### Build Process
1. **No Build Step Required**: Pure client-side application
2. **Static Files**: All HTML, CSS, JS served directly
3. **Serverless Functions**: API routes handled by Vercel
4. **Auto-Deploy**: GitHub integration triggers deployments

## 🔧 Error Handling Patterns

### CSV Processing Errors
```javascript
Papa.parse(file, {
    complete: function(results) {
        if (results.errors.length > 0) {
            showError(`CSV parsing error: ${results.errors[0].message}`);
            return;
        }
        // Process successful results
    },
    error: function(error) {
        showError(`File reading error: ${error.message}`);
    }
});
```

### Google Drive Access Errors
```javascript
// Iframe error handling
iframe.onerror = function() {
    // Fallback to text display
    iframe.style.display = 'none';
    showFallbackMessage();
};

// Download error handling
fetch(downloadUrl)
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        return response.blob();
    })
    .catch(error => {
        showError(`Download failed: ${error.message}`);
    });
```

## 📊 Performance Optimizations

### Lazy Loading
```javascript
// Load images only when visible
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            loadImage(entry.target);
        }
    });
});
```

### Debounced Search
```javascript
// Prevent excessive search calls
let searchTimeout;
function debouncedSearch(query) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        performSearch(query);
    }, 300);
}
```

### Staggered Downloads
```javascript
// Prevent browser blocking multiple downloads
items.forEach((item, index) => {
    setTimeout(() => {
        window.open(item.downloadUrl, '_blank');
    }, index * 500); // 500ms delay between downloads
});
```

## 🔍 Debugging and Maintenance

### Debug Endpoints
- `/api/debug.js`: Server status and configuration
- Console logging for client-side debugging
- Error boundaries for graceful failure handling

### Common Issues and Solutions

1. **CORS Errors**: Use server-side proxy
2. **CSV Parsing Failures**: Validate headers and encoding
3. **Google Drive Access**: Check file permissions
4. **Mobile Responsiveness**: Test on various screen sizes
5. **Performance**: Monitor file sizes and loading times

### Monitoring
```javascript
// Performance monitoring
console.time('CSV Processing');
// ... processing code ...
console.timeEnd('CSV Processing');

// Error tracking
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    // Send to monitoring service if needed
});
```

## 🔄 Future Enhancement Guidelines

### Adding New Modules
1. Create new directory with `index.html`, `styles.css`, `script.js`
2. Follow existing naming conventions
3. Implement consistent footer navigation
4. Add to main app navigation
5. Update README and technical docs

### Extending Functionality
1. Maintain backward compatibility
2. Use existing libraries (PapaParse, SheetJS)
3. Follow established patterns for state management
4. Implement proper error handling
5. Add comprehensive testing

### Version Management
- Update version numbers in HTML files
- Document changes in README
- Commit with descriptive messages
- Tag releases for major versions

---

This technical documentation provides the foundation for rebuilding, maintaining, or extending the MaddPrints App Suite. All modules follow consistent patterns and can be understood through this architectural overview.
