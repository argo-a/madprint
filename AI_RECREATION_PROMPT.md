# MaddPrints System - AI Recreation Prompt

## Project Overview
Create a web-based print business management system with multiple integrated modules for order tracking, invoice generation, and shipping management. The system should handle CSV data processing, Google Drive integration, and provide dual pricing structures for different business scenarios.

## Core System Requirements

### Technology Stack
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Libraries**: 
  - PapaParse (CSV parsing)
  - SheetJS/XLSX (Excel file handling)
  - No backend framework required (client-side only)
- **Deployment**: Static hosting compatible (Vercel, Netlify, etc.)

## Module 1: MaddPrints (Main Order Tracker)

### Core Functionality
Create an order tracking system that processes CSV files containing order data and enables quick lookup of order images via tracking numbers.

### Key Features

#### CSV File Processing
- Accept CSV uploads with order data
- Parse and validate required columns: `tracking_number`, `number`, `notes`, `shipping_address_first_name`, `shipping_address_last_name`
- Store processed data in browser localStorage for persistence
- Display upload history with ability to reload previous files
- Show statistics: total orders, orders with images, total files

#### Smart Barcode Processing
Implement intelligent tracking number processing:
- **UPS Detection**: If tracking starts with "1Z", use full value
- **Long Barcode Handling**: If length > 20 characters, remove first 8 digits (common prefix removal)
- **Standard Processing**: Use tracking number as-is for normal lengths
- Display processing information to user when modifications are made

#### Google Drive URL Extraction
- Parse `notes` field for Google Drive URLs using regex pattern: `/https:\/\/drive\.google\.com\/file\/d\/[a-zA-Z0-9_-]+\/view\?usp=drive_link/g`
- Extract file IDs from URLs for preview generation
- Support multiple images per order

#### Search and Display
- Real-time search by tracking number with Enter key support
- Clear input after search for rapid scanning workflow
- Display order details: tracking number, order number, customer name
- Show large image previews (500px height) with multiple viewing options:
  - Google Drive preview iframe
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
- Handle thumbnail loading with fallback to Google Drive previews

## Module 2: MaddInvoice (Invoice Generator)

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

## Module 3: MaddShip (Shipping Management)

### Core Functionality
Streamline shipping workflow with order processing, status tracking, and label generation integration.

### Key Features

#### Order Processing Workflow
- Load CSV files with order data including image URLs
- Display orders in compact grid format (3-4 columns)
- Sort orders by: date (oldest first) and image ID
- Show order thumbnails with customer information

#### Status Management System
- Track shipped status using localStorage per order ID
- Visual indicators: green highlighting for shipped items
- Persistent status across browser sessions
- Filter system to hide already shipped orders

#### Label Integration
- **Smart Click Behavior**: 
  - First click: Direct navigation to Veeqo URL
  - Second click: Show confirmation warning
- Track click count per order ID
- Generate Veeqo URLs from order numbers
- Handle already-shipped items with immediate warnings

#### Statistics and Monitoring
- Real-time counters: total orders, shipped count, pending count
- Progress tracking as orders are processed
- Visual feedback for workflow efficiency

#### URL Management
- Dedicated "View All URLs" section
- Extract and organize all Google Drive links
- Provide bulk access to order images
- Integration with main URL viewer

### Technical Implementation
- Implement click tracking system with localStorage
- Use CSS Grid for responsive order layout
- Handle image loading with fallback states
- Maintain shipping status persistence

## Module 4: View All URLs (Standalone Utility)

### Core Functionality
Centralized viewer for all Google Drive URLs extracted from order data across the system.

### Key Features

#### Data Integration
- Read Google Drive URLs from localStorage (populated by other modules)
- Display comprehensive list with order context:
  - Tracking number
  - Order number  
  - Customer name
  - Direct file links

#### Bulk Operations
- Provide organized view of all order images
- Enable bulk access to files
- Support cross-module data sharing
- Maintain data consistency across sessions

## System Integration Requirements

### Cross-Module Communication
- Use localStorage for data persistence and sharing
- Maintain consistent data structures across modules
- Enable seamless workflow between modules

### Navigation and UX
- Implement unified navigation footer across all modules
- Consistent visual design and branding
- Responsive design for mobile and desktop use
- Auto-versioning system with pre-commit hooks

### Data Structures

#### Order Data Format
```javascript
{
  tracking_number: "string",
  number: "string", 
  notes: "string", // Contains Google Drive URLs
  shipping_address_first_name: "string",
  shipping_address_last_name: "string",
  shipped_at: "date string", // For MaddInvoice
  quantity_shipped: "number" // For MaddInvoice
}
```

#### Google Drive URL Format
```javascript
{
  trackingNumber: "string",
  orderNumber: "string", 
  customerName: "string",
  url: "string",
  fileId: "string"
}
```

### Performance Considerations
- Client-side processing only (no backend required)
- Efficient CSV parsing with PapaParse
- Lazy loading for image previews
- localStorage optimization for large datasets

### Error Handling
- Graceful handling of malformed CSV data
- User-friendly error messages
- Fallback mechanisms for failed operations
- Data validation at multiple levels

## Implementation Priority
1. **MaddPrints (Main)**: Core order tracking functionality
2. **View All URLs**: Supporting utility for URL management  
3. **MaddInvoice**: Business invoice generation
4. **MaddShip**: Advanced shipping workflow management

Each module should be independently functional while maintaining data integration capabilities through localStorage communication.
