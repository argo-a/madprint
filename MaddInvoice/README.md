# MaddInvoice - Invoice Generator

A web-based invoice generator that processes production order data and calculates costs based on order quantities.

## Features

- **File Upload**: Supports both CSV and Excel files (.csv, .xlsx, .xls)
- **Date Filtering**: Filter orders by specific month and year based on `shipped_at` date
- **Cost Calculation**: 
  - Single item orders: $7.00
  - Multiple item orders: $7.25 per item
- **Excel Export**: Download processed invoice as Excel file
- **Responsive Design**: Works on desktop and mobile devices

## How to Use

1. **Upload Data File**
   - Click "Choose File" and select your CSV or Excel file
   - File must contain columns: `id`, `number`, `shipped_at`
   - The app will validate the file structure and show success/error messages

2. **Select Month and Year**
   - Choose the month and year you want to generate an invoice for
   - Only orders shipped in that specific month will be included

3. **Generate Invoice**
   - Click "Generate Invoice" to process the data
   - The app will:
     - Filter orders by the selected month/year
     - Group orders by ID and number combination
     - Calculate costs based on quantity rules
     - Display results with summary statistics

4. **Download Report**
   - Click "Download Excel Report" to save the invoice as an Excel file
   - File includes order details and summary totals

## Cost Calculation Rules

- **1 item per order**: $7.00 total
- **Multiple items per order**: $7.25 × quantity

## Example Output

For July 2025 with sample data:

| Order Number | Qty | Unit Cost | Total Cost |
|--------------|-----|-----------|------------|
| 111-8615107-2845064 | 1 | $7.00 | $7.00 |
| 113-3489177-0854601 | 2 | $7.25 | $14.50 |
| #1430 | 2 | $7.25 | $14.50 |

**Summary:**
- Total Orders: 3
- Total Prints: 5
- Total Amount Owed: $36.00

## File Structure

```
MaddInvoice/
├── index.html          # Main HTML interface
├── invoice.css         # Styling
├── invoice.js          # Processing logic
├── test-orders.csv     # Sample test data
└── README.md           # This documentation
```

## Technical Details

- **Frontend**: Pure HTML/CSS/JavaScript
- **CSV Parsing**: PapaParse library
- **Excel Processing**: SheetJS library
- **Deployment**: Vercel-ready static files
- **Version**: v1.7

## Version History

- **v1.7** (Current): Updated Excel export - moved summary to top, changed title to "Dimona Invoice Summary"
- **v1.6**: Removed year selector (hardcoded to 2025), greyed out Jan-May months (business started in June)
- **v1.5**: Added "Additional Shipping" column to show $0.25 fee for multi-item orders, added version display
- **v1.4**: Added Ship Date column and latest-to-oldest sorting
- **v1.3**: Updated cost calculation (single: $7.00, multiple: $7.00 per print + $0.25 order fee)
- **v1.2**: Improved table display and Excel export functionality
- **v1.1**: Enhanced file upload validation and error handling
- **v1.0**: Initial release with basic invoice generation

## URL Access

When deployed, the invoice feature will be available at:
`yourdomain.com/MaddInvoice/`

## Browser Compatibility

- Chrome/Edge (recommended)
- Firefox
- Safari
- Mobile browsers

## Troubleshooting

**File Upload Issues:**
- Ensure file has required columns: `id`, `number`, `shipped_at`
- Check that dates are in a recognizable format
- Verify file is not corrupted

**No Results:**
- Check that the selected month/year has shipped orders
- Verify date format in `shipped_at` column
- Ensure data is not filtered out by validation

**Download Issues:**
- Generate an invoice first before downloading
- Check browser's download settings
- Ensure popup blockers are disabled
