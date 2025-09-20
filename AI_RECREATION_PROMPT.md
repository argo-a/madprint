# MaddPrints System - AI Recreation Prompt v2.9

## Project Overview
Create a comprehensive web-based print business management system with four integrated modules for order tracking, invoice generation, and shipping management. The system handles CSV data processing, SKU-based image repository integration with Supabase, Google Drive fallback integration, and provides dual pricing structures for different business scenarios.

## Core System Requirements

### Technology Stack
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js with Vercel Serverless Functions
- **Libraries**: 
  - PapaParse (CSV parsing)
  - SheetJS/XLSX (Excel file handling)
  - Supabase JS Client (Image repository integration)
- **Storage**: Supabase for image repository, Vercel Blob for temporary files
- **Deployment**: Vercel with automatic GitHub integration

## Module 1: MaddPrints (Main Order Tracker)

### Core Functionality
Create an order tracking system that processes CSV files containing order data and enables quick lookup of order images via tracking numbers with SKU-based image repository integration.

### Key Features

#### CSV File Processing
- Accept CSV uploads with order data
- Parse and validate required columns: `tracking_number`, `number`, `notes`, `shipping_address_first_name`, `shipping_address_last_name`, `SKU`
- Store processed data in browser localStorage for persistence
- Display upload history with ability to reload previous files
- Show statistics: total orders, orders with images, total files

#### SKU-Based Image Repository Integration
Implement intelligent SKU processing for Supabase image repository:
- **SKU Processing**: Remove suffix patterns from SKU for image matching
  - Remove `-s-FBM` suffix (e.g., `WG_PM_FF-PA-Cloud-s-FBM` → `WG_PM_FF-PA-Cloud`)
  - Remove `-s` suffix (e.g., `WG_PM_FF-PA-Cloud-s` → `WG_PM_FF-PA-Cloud`)
  - Keep base SKU unchanged if no suffix found
- **Primary Image Source**: Supabase repository using processed SKU
- **Fallback System**: Google Drive URLs from notes column if Supabase image not found
- **Multiple Format Support**: Try common image extensions (.jpg, .png, .webp)

#### Smart Barcode Processing
Implement intelligent tracking number processing:
- **UPS Detection**: If tracking starts with "1Z", use full value
- **Long Barcode Handling**: If length > 20 characters, remove first 8 digits (common prefix removal)
- **Standard Processing**: Use tracking number as-is for normal lengths
- Display processing information to user when modifications are made

#### Image Loading Priority System
1. **Primary**: Attempt to load from Supabase using processed SKU
2. **Secondary**: Parse `notes` field for Google Drive URLs as fallback
3. **Tertiary**: Display placeholder image if both sources fail
4. **Error Handling**: Graceful degradation with user feedback

#### Search and Display
- Real-time search by tracking number with Enter key support
- Clear input after search for rapid scanning workflow
- Display order details: tracking number, order number, customer name, SKU
- Show large image previews (500px height) with multiple viewing options:
  - Supabase repository images (primary)
  - Google Drive preview iframe (fallback)
  - Direct file links
  - Download links with file ID extraction

#### Local Storage Management
- Save uploaded files with metadata (filename, date, order count)
- Maintain history of last 10 uploads
- Enable quick reloading of previous datasets

### Technical Implementation Details
- Use collapsible upload section to maximize screen space after data load
- Implement responsive 2-column layout (420px sidebar + flexible main area)
- Auto-focus search input for barcode scanner compatibility
- Handle thumbnail loading with fallback chain: Supabase → Google Drive → Placeholder
- Implement SKU processing function for suffix removal

## Module 2: View All URLs (Enhanced File Manager)

### Core Functionality
Centralized viewer for all images from both Supabase repository and Google Drive URLs with advanced management features.

### Key Features

#### Data Integration
- Read image data from localStorage (populated by other modules)
- Display comprehensive list with order context:
  - Tracking number
  - Order number  
  - Customer name
  - SKU (processed and original)
  - Image source (Supabase or Google Drive)

#### Advanced View Options
- **Grid View**: Visual thumbnail layout for quick browsing
- **List View**: Detailed tabular format with sorting options
- **View Toggle**: Seamless switching between display modes
- **Ship Date Sorting**: Sort by newest/oldest first
- **Source Filtering**: Filter by image source (Supabase/Google Drive)

#### Multi-Select Operations
- Checkbox selection for individual files
- "Select All" functionality for bulk operations
- Selective download capabilities
- Visual feedback for selected items

#### SKU-Based Image Management
- Display both original and processed SKU values
- Show image source indicator (Supabase repository vs Google Drive)
- Enable bulk operations on SKU-matched images
- Support cross-module data sharing with SKU context

## Module 3: MaddInvoice (Invoice Generator)

### Core Functionality
Generate monthly invoices from production order data with dual pricing structures for different business relationships.

### Key Features

#### Data Processing
- Accept CSV/Excel files with production order data
- Required columns: `shipped_at`, `id`, `number`, `quantity_shipped`
- Validate data structure and show helpful error messages
- Filter orders by month and year (hardcoded to 2025)

#### Business Logic Implementation
- **Base Pricing**: $6.30 per print (discounted rate)
- **Premium Pricing**: $7.00 per print (Dimona rate)
- **Shipping Logic**: $0.25 additional fee for multi-item orders (qty > 1)
- **Order Grouping**: Combine items by order ID and number
- **Date Filtering**: Filter by `shipped_at` date for selected month

#### Invoice Generation
- Calculate totals: order count, total prints, total amount owed
- Sort orders by ship date (newest first)
- Display detailed order table with:
  - Order number
  - Ship date (MM/DD/YYYY format)
  - Quantity
  - Unit cost
  - Additional shipping fee
  - Total cost per order

#### Export Functionality
Generate two types of Excel downloads:
1. **Dimona Invoice**: $7.00 pricing with summary and detailed breakdown
2. **Discounted Invoice**: $6.30 pricing with summary and detailed breakdown

Include metadata: generation date, totals summary, and formatted order details.

### Technical Implementation
- Use SheetJS for Excel file generation
- Implement proper error handling for missing columns
- Show loading states during processing
- Maintain responsive design with results preview

## Module 4: MaddShip (Shipping Management)

### Core Functionality
Streamline shipping workflow with order processing, status tracking, and label generation integration.

### Key Features

#### Order Processing Workflow
- Load CSV files with order data including SKU and image information
- Display orders in compact grid format (3-4 columns)
- Sort orders by: date (oldest first) and SKU
- Show order thumbnails with customer information using SKU-based images

#### SKU-Based Image Display
- Primary image source from Supabase repository using processed SKU
- Fallback to Google Drive URLs from notes column
- Display SKU information alongside order details
- Visual indicators for image source (repository vs fallback)

#### Status Management System
- Track shipped status using localStorage per order ID
- Visual indicators: green highlighting for shipped items
- Persistent status across browser sessions
- Filter system to hide already shipped orders

#### Label Integration
- **Smart Click Behavior**: 
  - First click: Direct navigation to shipping label URL
  - Second click: Show confirmation warning
- Track click count per order ID
- Generate shipping URLs from order numbers
- Handle already-shipped items with immediate warnings

#### Statistics and Monitoring
- Real-time counters: total orders, shipped count, pending count
- Progress tracking as orders are processed
- Visual feedback for workflow efficiency
- SKU-based organization and filtering

### Technical Implementation
- Implement click tracking system with localStorage
- Use CSS Grid for responsive order layout
- Handle image loading with Supabase → Google Drive → Placeholder fallback
- Maintain shipping status persistence
- Integrate SKU processing for consistent image display

## Supabase Integration Requirements

### Image Repository Configuration
- **Supabase Project Setup**: Configure project URL and API keys
- **Storage Bucket**: Dedicated bucket for product images
- **File Naming Convention**: Images stored with processed SKU as filename
- **Supported Formats**: .jpg, .png, .webp extensions
- **URL Structure**: `https://[project].supabase.co/storage/v1/object/public/[bucket]/[processed-sku].[ext]`

### SKU Processing Algorithm
```javascript
function processSKU(fullSKU) {
  // Remove everything from '-s' onwards (including -s-FBM, -s, etc.)
  const suffixPattern = /-s.*$/;
  return fullSKU.replace(suffixPattern, '');
}

// Examples:
// "WG_PM_FF-PA-Cloud-s-FBM" → "WG_PM_FF-PA-Cloud"
// "WG_PM_FF-PA-Cloud-s" → "WG_PM_FF-PA-Cloud"
// "WG_PM_FF-PA-Cloud" → "WG_PM_FF-PA-Cloud" (unchanged)
```

### Image Loading Strategy
```javascript
async function loadProductImage(sku) {
  const processedSKU = processSKU(sku);
  const extensions = ['jpg', 'png', 'webp'];
  
  // Try Supabase repository first
  for (const ext of extensions) {
    const supabaseUrl = `${SUPABASE_URL}/storage/v1/object/public/images/${processedSKU}.${ext}`;
    if (await imageExists(supabaseUrl)) {
      return { source: 'supabase', url: supabaseUrl };
    }
  }
  
  // Fallback to Google Drive if available
  const googleDriveUrl = extractGoogleDriveUrl(notesField);
  if (googleDriveUrl) {
    return { source: 'googledrive', url: googleDriveUrl };
  }
  
  // Return placeholder if no image found
  return { source: 'placeholder', url: '/images/placeholder.png' };
}
```

## System Integration Requirements

### Cross-Module Communication
- Use localStorage for data persistence and sharing
- Maintain consistent data structures across modules with SKU integration
- Enable seamless workflow between modules with image source tracking

### Navigation and UX
- Implement unified navigation footer across all modules:
  - 🏠 Home (Main Order Tracker)
  - 📋 View URLs (Enhanced File Manager)
  - 📄 Invoice Generator (MaddInvoice)
  - 🚢 MaddShip (Shipping Management)
- Consistent visual design and branding
- Responsive design for mobile and desktop use
- Auto-versioning system with pre-commit hooks

### Data Structures

#### Order Data Format
```javascript
{
  tracking_number: "string",
  number: "string", 
  notes: "string", // Contains Google Drive URLs (fallback)
  shipping_address_first_name: "string",
  shipping_address_last_name: "string",
  SKU: "string", // Primary field for image repository lookup
  shipped_at: "date string", // For MaddInvoice
  quantity_shipped: "number" // For MaddInvoice
}
```

#### Image Data Format
```javascript
{
  trackingNumber: "string",
  orderNumber: "string", 
  customerName: "string",
  originalSKU: "string",
  processedSKU: "string",
  imageSource: "supabase|googledrive|placeholder",
  imageUrl: "string",
  fallbackUrl: "string" // Google Drive URL if available
}
```

### Performance Considerations
- Efficient SKU processing and caching
- Lazy loading for image previews with fallback chain
- localStorage optimization for large datasets
- Supabase connection pooling and error handling

### Error Handling
- Graceful handling of malformed CSV data
- User-friendly error messages for missing images
- Fallback mechanisms for failed Supabase connections
- Data validation at multiple levels including SKU format
- Comprehensive image loading error recovery

## CSV Format Requirements

### Main App, View URLs & MaddShip
```csv
tracking_number,notes,shipped_at,number,shipping_address_first_name,shipping_address_last_name,SKU
1Z123456789,https://drive.google.com/file/d/FILE_ID/view?usp=drive_link,2025-08-29,ORD001,John,Doe,WG_PM_FF-PA-Cloud-s-FBM
```

### MaddInvoice
```csv
shipped_at,id,number,quantity_shipped
2025-06-01,12345,ORD001,2
```

## Deployment and Infrastructure

### Vercel Configuration
- **Automatic Deployments**: GitHub integration with auto-deploy
- **Serverless Functions**: API endpoints with automatic scaling
- **Environment Variables**: Supabase configuration and API keys

### Supabase Configuration
- **Project URL**: Environment variable for Supabase project
- **Storage Bucket**: Public bucket for product images
- **API Keys**: Public anon key for client-side access
- **CORS Settings**: Configured for Vercel domain access

### Dependencies
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.0.0"
  }
}
```

### CDN Libraries
- Papa Parse 5.4.1 (CSV parsing)
- XLSX.js 0.18.5 (Excel handling)

## Implementation Priority
1. **MaddPrints (Main)**: Core order tracking with SKU-based image repository
2. **View All URLs**: Enhanced file management with Supabase integration
3. **MaddInvoice**: Business invoice generation
4. **MaddShip**: Shipping workflow with SKU-based image display

Each module should be independently functional while maintaining data integration capabilities through localStorage communication and consistent SKU-based image handling.

## Version Information
- **Current Version**: 2.9
- **Architecture**: Full-stack with Supabase integration
- **Deployment**: Vercel with GitHub integration
- **Image Repository**: Supabase Storage
- **Live URL**: https://madprint.vercel.app

## Security and Performance
- **Supabase RLS**: Row Level Security for image access control
- **Environment Variables**: Secure configuration management
- **Image Optimization**: Efficient loading with fallback strategies
- **CORS Handling**: Proper cross-origin request management
- **Progressive Loading**: Optimized user experience with image source prioritization
