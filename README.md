# MaddPrints App Suite v2.5

A comprehensive web application suite for print business operations, featuring tracking number management, invoice generation, and duplicate detection.

## 🚀 App Suite Overview

The MaddPrints App Suite consists of four integrated modules:

### 1. **Main App (Home)** - Tracking Number Image Matcher
- Upload CSV files with tracking numbers and Google Drive URLs
- Smart search by tracking number to find associated product images
- Embedded Google Drive previews with download capabilities
- File upload history with localStorage persistence

### 2. **View URLs** - Comprehensive File Manager
- Display all Google Drive URLs from uploaded CSV files
- Grid and List view modes with toggle functionality
- Multi-select functionality with selective downloads
- Ship date sorting (newest/oldest first)
- Bulk download capabilities

### 3. **MaddInvoice** - Invoice Generator
- Generate monthly invoices from production order data
- Excel and CSV file support
- Month-based filtering for 2025
- Downloadable Excel reports
- Order summary and detailed breakdowns

### 4. **Duplicator** - Package Duplicate Checker
- Upload CSV files with tracking numbers
- Smart barcode scanning with auto-submit functionality
- Duplicate detection with customer name display
- Missing package identification
- Real-time analysis with comprehensive reporting

## 🛠️ Technical Features

### Smart Barcode Processing
- **UPS 1Z Prefix Handling**: Automatically processes UPS tracking numbers
- **Long Number Prefix Removal**: Strips prefixes from scanned barcodes
- **Auto-Submit**: No manual "Add Item" clicks required

### Google Drive Integration
- **Embedded Previews**: Direct iframe previews of Google Drive files
- **Multiple URL Formats**: Supports view, preview, and download URLs
- **CORS Bypass**: Server-side proxy for reliable file access

### Data Management
- **CSV Processing**: PapaParse library for robust CSV handling
- **LocalStorage**: Persistent data storage for user sessions
- **File Upload History**: Track previously uploaded files

### User Experience
- **Responsive Design**: Works on desktop and mobile devices
- **Seamless Navigation**: Footer navigation across all modules
- **Visual Feedback**: Loading states, success/error messages
- **Multi-View Support**: Grid/List toggles where applicable

## 📁 Project Structure

```
MaddPrints/
├── index.html              # Main app (v2.4)
├── view-urls.html          # File manager with multi-select
├── MaddInvoice/
│   ├── index.html          # Invoice generator (v1.7)
│   ├── invoice.css         # Styling
│   ├── invoice.js          # Logic
│   └── test-orders.csv     # Sample data
├── Duplicator/
│   ├── index.html          # Duplicate checker (v1.2)
│   ├── duplicator.css      # Styling
│   ├── duplicator.js       # Logic
│   └── test-tracking.csv   # Sample data
├── api/
│   ├── proxy.js            # CORS bypass proxy
│   ├── download-files.js   # File download handler
│   ├── serve-file.js       # File serving
│   ├── clear-downloads.js  # Cleanup utility
│   └── debug.js            # Debug endpoint
├── chrome-extension/       # Browser extension (optional)
├── vercel.json            # Deployment configuration
└── README.md              # This file
```

## 🚀 Deployment

### Vercel Deployment (Recommended)
1. **Push to GitHub**: Ensure all files are committed
2. **Connect to Vercel**: Import GitHub repository
3. **Auto-Deploy**: Vercel handles configuration automatically
4. **Access**: Available at your Vercel domain

### Local Development
```bash
# Clone repository
git clone https://github.com/argo-a/madprint.git
cd MaddPrints

# Serve locally (Python)
python -m http.server 8000

# Or use any local server
# Access at http://localhost:8000
```

## 📊 Usage Guide

### Main App Workflow
1. **Upload CSV**: Select file with tracking numbers and Google Drive URLs
2. **Search**: Enter tracking number to find associated files
3. **Preview**: View embedded Google Drive previews
4. **Download**: Use download buttons for offline access

### View URLs Workflow
1. **Upload CSV**: Process file to extract all Google Drive URLs
2. **Choose View**: Toggle between Grid and List views
3. **Select Files**: Use checkboxes for multi-select
4. **Sort**: Order by ship date (newest/oldest)
5. **Download**: Bulk download all or selected files

### MaddInvoice Workflow
1. **Upload Data**: Select Excel/CSV with production orders
2. **Select Month**: Choose month for invoice generation
3. **Generate**: Create invoice with summary and details
4. **Download**: Export Excel report

### Duplicator Workflow
1. **Upload CSV**: Load file with tracking numbers
2. **Scan Items**: Use barcode scanner or manual entry
3. **Auto-Submit**: Items automatically added (no manual clicks)
4. **Analyze**: Run duplicate detection analysis
5. **Review Results**: Check duplicates, missing, and extra items

## 🔧 CSV Format Requirements

### Main App & View URLs
```csv
tracking_number,notes,shipped_at,number,shipping_address_first_name,shipping_address_last_name
1Z123456789,https://drive.google.com/file/d/FILE_ID/view?usp=drive_link,2025-08-29,ORD001,John,Doe
```

### MaddInvoice
```csv
order_date,order_number,customer_name,amount,status
2025-06-01,ORD001,John Doe,150.00,completed
```

### Duplicator
```csv
tracking_number,customer_name
1Z123456789,John Doe
```

## 🎯 Key Features by Module

### Main App
- ✅ Smart tracking number search
- ✅ Embedded Google Drive previews
- ✅ File upload history
- ✅ Customer name display
- ✅ Responsive design

### View URLs
- ✅ Grid/List view toggle
- ✅ Multi-select with checkboxes
- ✅ Ship date sorting
- ✅ Bulk download functionality
- ✅ Selective file downloads

### MaddInvoice
- ✅ Monthly invoice generation
- ✅ Excel/CSV support
- ✅ Downloadable reports
- ✅ Order summaries
- ✅ 2025 month filtering

### Duplicator
- ✅ Smart barcode processing
- ✅ Auto-submit functionality
- ✅ Duplicate detection
- ✅ Missing package identification
- ✅ Real-time analysis

## 🔒 Security & Performance

- **Server-Side CORS Bypass**: Reliable Google Drive access
- **Client-Side Processing**: No sensitive data stored on server
- **LocalStorage**: Secure local data persistence
- **Responsive Design**: Optimized for all devices
- **Error Handling**: Comprehensive error management

## 🆕 Version History

- **v2.5**: Added comprehensive technical documentation and updated README
- **v2.4**: Enhanced footer navigation across all modules
- **v2.3**: Added customer names and embedded previews
- **v2.2**: Multi-select and view toggle functionality
- **v2.1**: Ship date sorting and enhanced UI
- **v2.0**: Complete app suite with all modules

## 📝 License

This project is for internal business use. All rights reserved.

---

**Live App**: [https://madprint.vercel.app](https://madprint.vercel.app)
**Repository**: [https://github.com/argo-a/madprint](https://github.com/argo-a/madprint)
