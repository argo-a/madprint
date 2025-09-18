# MaddPrints Technical Documentation

## Overview
MaddPrints is a comprehensive web application suite designed to streamline print business operations. The application consists of multiple integrated modules that handle different aspects of the business workflow.

## Version: 2.8.15

## Application Modules

### 1. 📦 Order Tracker (Main Module)
**Location:** `/` (root)
**Purpose:** Core order tracking and Google Drive file management

**Features:**
- CSV upload with order data
- Smart barcode processing (UPS tracking support)
- Google Drive URL extraction and preview
- Order search by tracking number
- File preview with iframe integration
- Previous upload history management

**Key Files:**
- `index.html` - Main interface
- Smart barcode processing with prefix removal
- Google Drive integration for file previews

### 2. 📄 MaddInvoice
**Location:** `/MaddInvoice/`
**Purpose:** Monthly invoice generation from production data

**Features:**
- Excel/CSV file upload
- Month-based filtering (2025)
- Automatic invoice calculation
- Excel report generation
- Production order analysis

**Key Files:**
- `MaddInvoice/index.html` - Main interface
- `MaddInvoice/invoice.js` - Business logic
- `MaddInvoice/invoice.css` - Styling

### 3. 🔍 Duplicator
**Location:** `/Duplicator/`
**Purpose:** Package duplicate detection and missing item identification

**Features:**
- CSV upload with tracking numbers
- Barcode scanning interface
- Smart duplicate detection
- Missing package identification
- Customer name association
- Excel export of analysis results

**Key Files:**
- `Duplicator/index.html` - Main interface
- `Duplicator/duplicator.js` - Analysis logic
- `Duplicator/duplicator.css` - Styling
- `Duplicator/test-tracking.csv` - Sample data

### 4. 🎨 FILE PREP
**Location:** `/FilePrep/`
**Purpose:** Automated artwork processing and rotation

**Features:**
- CSV upload with Google Drive URLs
- Automatic file download from Google Drive
- Server-side image processing with Sharp library
- 90-degree clockwise rotation
- Asynchronous job processing
- Real-time progress tracking
- Multi-select download interface
- Memory-efficient architecture for large files (30MB+)

**Key Files:**
- `FilePrep/index.html` - Main interface
- `FilePrep/fileprep.js` - Frontend logic
- `FilePrep/fileprep.css` - Styling

## Backend APIs

### File Processing APIs
**Location:** `/api/`

#### `/api/file-prep-start`
- **Method:** POST
- **Purpose:** Start file processing job
- **Features:**
  - Downloads files from Google Drive URLs
  - Rotates images 90 degrees clockwise using Sharp
  - Stores processed files in Vercel Blob storage
  - Returns job ID for tracking

#### `/api/file-prep-status`
- **Method:** GET
- **Purpose:** Check job progress and status
- **Features:**
  - Real-time progress tracking
  - File processing status
  - Download URLs for completed files

### Other APIs
- `/api/proxy.js` - Proxy for external requests
- `/api/download-files.js` - File download handling
- `/api/serve-file.js` - File serving
- `/api/clear-downloads.js` - Cleanup utilities
- `/api/debug.js` - Debug utilities

## Technical Architecture

### Frontend Technologies
- **HTML5** - Modern semantic markup
- **CSS3** - Responsive design with Grid and Flexbox
- **Vanilla JavaScript** - No framework dependencies
- **Papa Parse** - CSV parsing library
- **XLSX.js** - Excel file handling

### Backend Technologies
- **Node.js** - Server runtime
- **Vercel** - Hosting platform
- **Vercel Blob** - File storage
- **Sharp** - High-performance image processing
- **Serverless Functions** - API endpoints

### Key Features
- **Responsive Design** - Mobile-friendly interfaces
- **Progressive Enhancement** - Works without JavaScript
- **Memory Efficiency** - Handles large files without browser crashes
- **Real-time Updates** - Live progress tracking
- **Smart Processing** - Intelligent barcode handling
- **Batch Operations** - Multi-file processing

## File Processing Workflow (FILE PREP)

1. **Upload CSV** - User uploads CSV with Google Drive URLs
2. **URL Extraction** - System extracts Google Drive file URLs from notes column
3. **Job Creation** - Server creates processing job with unique ID
4. **File Download** - System downloads files from Google Drive
5. **Image Processing** - Sharp library rotates images 90 degrees clockwise
6. **Storage** - Processed files stored in Vercel Blob
7. **Progress Tracking** - Real-time updates via polling
8. **Download Interface** - Multi-select download of processed files

## Smart Barcode Processing

The application includes intelligent barcode processing that handles various tracking number formats:

1. **UPS Tracking (1Z prefix)** - Uses full tracking number
2. **Long Barcodes** - Removes first 8 digits (prefix removal)
3. **Standard Format** - Uses as-is

## Navigation Structure

All modules are integrated with consistent navigation:
- 🏠 Home (Order Tracker)
- 📋 View URLs
- 📄 Invoice Generator (MaddInvoice)
- 🔍 Duplicator
- 🎨 FILE PREP

## Deployment

The application is deployed on Vercel with:
- Automatic deployments from GitHub
- Serverless function APIs
- Blob storage for file handling
- Environment variable configuration

## Dependencies

### Production Dependencies
```json
{
  "sharp": "^0.33.0"
}
```

### CDN Dependencies
- Papa Parse 5.4.1
- XLSX.js 0.18.5

## Version History

### v2.8.15 (Current)
- Added complete FILE PREP module
- Server-side image processing with Sharp
- Asynchronous job processing
- Multi-select download interface
- Updated all modules to v2.8

### v2.7
- Added Duplicator module
- Enhanced barcode processing
- Improved navigation

## Security Considerations

- Server-side file processing prevents client-side memory issues
- Temporary file storage with automatic cleanup
- Input validation and sanitization
- CORS handling for cross-origin requests

## Performance Optimizations

- Asynchronous processing for large files
- Memory-efficient image processing
- Progressive loading interfaces
- Optimized file storage and retrieval
- Client-side caching for repeated operations

## Future Enhancements

- Batch processing optimization
- Additional image formats support
- Enhanced progress tracking
- File compression options
- Advanced filtering and search capabilities
