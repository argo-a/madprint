let orderData = [];
let processedResults = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('dataFile').addEventListener('change', handleFileUpload);
});

// Handle file upload (CSV or Excel)
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const uploadStatus = document.getElementById('uploadStatus');
    uploadStatus.innerHTML = '<div class="loading"><div class="spinner"></div>Processing file...</div>';

    const fileExtension = file.name.split('.').pop().toLowerCase();

    if (fileExtension === 'csv') {
        parseCSVFile(file);
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        parseExcelFile(file);
    } else {
        uploadStatus.innerHTML = '<div class="error-message">Please upload a CSV or Excel file</div>';
    }
}

// Parse CSV file using PapaParse
function parseCSVFile(file) {
    Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        delimitersToGuess: [',', '\t', '|', ';'],
        complete: function(results) {
            if (results.errors.length > 0) {
                document.getElementById('uploadStatus').innerHTML = 
                    `<div class="error-message">Error parsing CSV: ${results.errors[0].message}</div>`;
                return;
            }
            processUploadedData(results.data);
        },
        error: function(error) {
            document.getElementById('uploadStatus').innerHTML = 
                `<div class="error-message">Error reading file: ${error.message}</div>`;
        }
    });
}

// Parse Excel file using SheetJS
function parseExcelFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            processUploadedData(jsonData);
        } catch (error) {
            document.getElementById('uploadStatus').innerHTML = 
                `<div class="error-message">Error parsing Excel file: ${error.message}</div>`;
        }
    };
    reader.readAsArrayBuffer(file);
}

// Process the uploaded data
function processUploadedData(data) {
    // Clean headers by removing whitespace
    const cleanData = data.map(row => {
        const cleanRow = {};
        Object.keys(row).forEach(key => {
            const cleanKey = key.trim();
            cleanRow[cleanKey] = row[key];
        });
        return cleanRow;
    });

    orderData = cleanData;
    
    const uploadStatus = document.getElementById('uploadStatus');
    uploadStatus.innerHTML = `<div class="success-message">✅ Successfully loaded ${orderData.length} records!</div>`;
    
    // Show filter section
    document.getElementById('filterSection').style.display = 'block';
    
    // Validate required columns
    validateDataStructure();
}

// Validate that required columns exist
function validateDataStructure() {
    if (orderData.length === 0) return;
    
    const firstRow = orderData[0];
    const requiredColumns = ['shipped_at', 'id', 'number', 'quantity'];
    const missingColumns = requiredColumns.filter(col => !(col in firstRow));
    
    if (missingColumns.length > 0) {
        document.getElementById('filterStatus').innerHTML = 
            `<div class="error-message">Missing required columns: ${missingColumns.join(', ')}</div>`;
        return false;
    }
    
    return true;
}

// Generate invoice for selected month
function generateInvoice() {
    const monthSelect = document.getElementById('monthSelect');
    const filterStatus = document.getElementById('filterStatus');
    
    if (!monthSelect.value) {
        filterStatus.innerHTML = '<div class="error-message">Please select a month</div>';
        return;
    }
    
    if (!validateDataStructure()) {
        return;
    }
    
    const selectedMonth = parseInt(monthSelect.value);
    const selectedYear = 2025; // Hardcoded to 2025
    
    filterStatus.innerHTML = '<div class="loading"><div class="spinner"></div>Generating invoice...</div>';
    
    try {
        // Filter data by selected month and year
        const filteredData = filterByMonth(orderData, selectedMonth, selectedYear);
        
        if (filteredData.length === 0) {
            filterStatus.innerHTML = '<div class="error-message">No orders found for the selected month and year</div>';
            return;
        }
        
        // Calculate costs for individual line items
        const invoiceResults = calculateCosts(filteredData);
        
        processedResults = invoiceResults;
        
        // Display results
        displayResults(invoiceResults, selectedMonth, selectedYear);
        
        filterStatus.innerHTML = `<div class="success-message">✅ Invoice generated successfully! Found ${invoiceResults.lineItems.length} line items.</div>`;
        
        // Show results section and hide placeholder
        document.getElementById('resultsSection').style.display = 'block';
        document.getElementById('defaultPlaceholder').style.display = 'none';
        
    } catch (error) {
        filterStatus.innerHTML = `<div class="error-message">Error generating invoice: ${error.message}</div>`;
    }
}

// Filter data by shipped_at month and year
function filterByMonth(data, selectedMonth, selectedYear) {
    return data.filter(row => {
        if (!row.shipped_at) return false;
        
        const shippedDate = new Date(row.shipped_at);
        return shippedDate.getMonth() === selectedMonth && shippedDate.getFullYear() === selectedYear;
    });
}


// Calculate costs based on business rules
function calculateCosts(filteredData) {
    // First, process individual line items for print costs (no shipping fee per item)
    const lineItems = filteredData.map(row => {
        const qty = parseInt(row.quantity) || 0; // Use quantity field directly
        const unitCost = 6.30; // Always $6.30 per print
        const printsCost = qty * 6.30; // Base cost for prints only
        
        const shippedAt = row.shipped_at;
        const shippedDate = new Date(shippedAt);
        
        return {
            orderNumber: row.number,
            orderId: row.id,
            qty: qty,
            unitCost: unitCost,
            printsCost: printsCost,
            shippedAt: shippedAt,
            shippedDate: shippedDate,
            simplifiedShipDate: shippedDate.toLocaleDateString('en-US', {
                month: '2-digit',
                day: '2-digit',
                year: 'numeric'
            })
        };
    });
    
    // Group by order ID to count orders with multiple items
    const orderGroups = {};
    filteredData.forEach(row => {
        const orderId = row.id;
        if (!orderGroups[orderId]) {
            orderGroups[orderId] = [];
        }
        orderGroups[orderId].push(row);
    });
    
    // Count orders with multiple line items
    const multiItemOrders = Object.values(orderGroups).filter(items => items.length > 1);
    const multiItemOrderCount = multiItemOrders.length;
    const totalShippingFee = multiItemOrderCount * 0.25;
    
    // Add shipping fee information to results
    const results = {
        lineItems: lineItems,
        multiItemOrderCount: multiItemOrderCount,
        totalShippingFee: totalShippingFee
    };
    
    // Sort line items by shipped date, latest to oldest
    results.lineItems.sort((a, b) => b.shippedDate - a.shippedDate);
    
    return results;
}

// Display results on the page
function displayResults(results, selectedMonth, selectedYear) {
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    // Calculate totals from line items
    const totalPrints = results.lineItems.reduce((sum, item) => sum + item.qty, 0);
    const totalPrintsCost = results.lineItems.reduce((sum, item) => sum + item.printsCost, 0);
    const totalAmount = totalPrintsCost + results.totalShippingFee;
    
    // Display summary
    const summaryContent = document.getElementById('summaryContent');
    summaryContent.innerHTML = `
        <div class="month-year-display">${monthNames[selectedMonth]} ${selectedYear}</div>
        <div class="summary-stats">
            <div class="stat-item">
                <div class="stat-value">${results.lineItems.length}</div>
                <div class="stat-label">Total Line Items</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${totalPrints}</div>
                <div class="stat-label">Total Prints</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${results.multiItemOrderCount}</div>
                <div class="stat-label">Multi-Item Orders</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">$${results.totalShippingFee.toFixed(2)}</div>
                <div class="stat-label">Shipping Fee</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">$${totalAmount.toFixed(2)}</div>
                <div class="stat-label">Total Amount Owed</div>
            </div>
        </div>
    `;
    
    // Display orders table
    const ordersTableContent = document.getElementById('ordersTableContent');
    let tableHTML = `
        <div class="table-container">
            <table class="invoice-table">
                <thead>
                    <tr>
                        <th>Order Number</th>
                        <th>Ship Date</th>
                        <th>Qty</th>
                        <th>Unit Cost</th>
                        <th>Print Cost</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    results.lineItems.forEach(item => {
        tableHTML += `
            <tr>
                <td>${item.orderNumber}</td>
                <td>${item.simplifiedShipDate}</td>
                <td>${item.qty}</td>
                <td>$${item.unitCost.toFixed(2)}</td>
                <td class="cost-cell">$${item.printsCost.toFixed(2)}</td>
            </tr>
        `;
    });
    
    // Add shipping fee row if there are multi-item orders
    if (results.multiItemOrderCount > 0) {
        tableHTML += `
            <tr class="shipping-fee-row" style="border-top: 2px solid #ddd; font-weight: bold;">
                <td colspan="4">Shipping Fee (${results.multiItemOrderCount} multi-item orders × $0.25)</td>
                <td class="cost-cell">$${results.totalShippingFee.toFixed(2)}</td>
            </tr>
        `;
    }
    
    // Add total row
    tableHTML += `
        <tr class="total-row" style="border-top: 2px solid #333; font-weight: bold; background-color: #f5f5f5;">
            <td colspan="4">TOTAL</td>
            <td class="cost-cell">$${totalAmount.toFixed(2)}</td>
        </tr>
    `;
    
    tableHTML += `
                </tbody>
            </table>
        </div>
    `;
    
    ordersTableContent.innerHTML = tableHTML;
}

// Download Dimona Invoice (with $7.00 pricing)
function downloadDimonaInvoice() {
    if (!processedResults || !processedResults.lineItems || processedResults.lineItems.length === 0) {
        alert('No data to download. Please generate an invoice first.');
        return;
    }
    
    // Recalculate with $7.00 pricing for Dimona invoice
    const dimonaLineItems = processedResults.lineItems.map(item => {
        const unitCost = 7.00;
        const printsCost = item.qty * 7.00;
        
        return {
            ...item,
            unitCost: unitCost,
            printsCost: printsCost
        };
    });
    
    // Calculate totals with $7.00 pricing
    const totalPrints = dimonaLineItems.reduce((sum, item) => sum + item.qty, 0);
    const totalPrintsCost = dimonaLineItems.reduce((sum, item) => sum + item.printsCost, 0);
    const totalAmount = totalPrintsCost + processedResults.totalShippingFee;
    
    // Prepare data for Excel
    const excelData = [
        ['Dimona Invoice Summary ($7.00)'],
        ['Generated on:', new Date().toLocaleDateString()],
        [''],
        ['SUMMARY'],
        ['Total Line Items:', dimonaLineItems.length],
        ['Total Prints:', totalPrints],
        ['Multi-Item Orders:', processedResults.multiItemOrderCount],
        ['Shipping Fee:', processedResults.totalShippingFee],
        ['Total Amount Owed:', totalAmount],
        [''],
        ['Order Number', 'Ship Date', 'Qty', 'Unit Cost', 'Print Cost']
    ];
    
    // Add line item data
    dimonaLineItems.forEach(item => {
        excelData.push([
            item.orderNumber,
            item.simplifiedShipDate,
            item.qty,
            item.unitCost,
            item.printsCost
        ]);
    });
    
    // Add shipping fee row
    if (processedResults.multiItemOrderCount > 0) {
        excelData.push(['', '', '', 'Shipping Fee:', processedResults.totalShippingFee]);
    }
    
    // Add total row
    excelData.push(['', '', '', 'TOTAL:', totalAmount]);
    
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    
    // Style the header
    ws['A1'] = { v: 'Dimona Invoice Summary ($7.00)', t: 's', s: { font: { bold: true, sz: 16 } } };
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Invoice');
    
    // Generate filename with current date
    const today = new Date();
    const filename = `MaddInvoice_${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}.xlsx`;
    
    // Download file
    XLSX.writeFile(wb, filename);
}

// Download Discounted Invoice (with $6.30 pricing)
function downloadDiscountedInvoice() {
    if (!processedResults || !processedResults.lineItems || processedResults.lineItems.length === 0) {
        alert('No data to download. Please generate an invoice first.');
        return;
    }
    
    // Use existing processedResults which already have $6.30 pricing
    const totalPrints = processedResults.lineItems.reduce((sum, item) => sum + item.qty, 0);
    const totalPrintsCost = processedResults.lineItems.reduce((sum, item) => sum + item.printsCost, 0);
    const totalAmount = totalPrintsCost + processedResults.totalShippingFee;
    
    // Prepare data for Excel
    const excelData = [
        ['Discounted Invoice Summary ($6.30)'],
        ['Generated on:', new Date().toLocaleDateString()],
        [''],
        ['SUMMARY'],
        ['Total Line Items:', processedResults.lineItems.length],
        ['Total Prints:', totalPrints],
        ['Multi-Item Orders:', processedResults.multiItemOrderCount],
        ['Shipping Fee:', processedResults.totalShippingFee],
        ['Total Amount Owed:', totalAmount],
        [''],
        ['Order Number', 'Ship Date', 'Qty', 'Unit Cost', 'Print Cost']
    ];
    
    // Add line item data
    processedResults.lineItems.forEach(item => {
        excelData.push([
            item.orderNumber,
            item.simplifiedShipDate,
            item.qty,
            item.unitCost,
            item.printsCost
        ]);
    });
    
    // Add shipping fee row
    if (processedResults.multiItemOrderCount > 0) {
        excelData.push(['', '', '', 'Shipping Fee:', processedResults.totalShippingFee]);
    }
    
    // Add total row
    excelData.push(['', '', '', 'TOTAL:', totalAmount]);
    
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    
    // Style the header
    ws['A1'] = { v: 'Discounted Invoice Summary ($6.30)', t: 's', s: { font: { bold: true, sz: 16 } } };
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Invoice');
    
    // Generate filename with current date
    const today = new Date();
    const filename = `DiscountedInvoice_${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}.xlsx`;
    
    // Download file
    XLSX.writeFile(wb, filename);
}
