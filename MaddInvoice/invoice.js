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
    const requiredColumns = ['shipped_at', 'id', 'number', 'quantity_shipped'];
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
        
        // Group by order and calculate costs
        const groupedOrders = groupByOrder(filteredData);
        const invoiceResults = calculateCosts(groupedOrders);
        
        processedResults = invoiceResults;
        
        // Display results
        displayResults(invoiceResults, selectedMonth, selectedYear);
        
        filterStatus.innerHTML = `<div class="success-message">✅ Invoice generated successfully! Found ${invoiceResults.length} orders.</div>`;
        
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

// Group orders by ID and number combination
function groupByOrder(filteredData) {
    const orders = {};
    
    filteredData.forEach(row => {
        const orderKey = `${row.id}-${row.number}`;
        
        if (!orders[orderKey]) {
            orders[orderKey] = {
                orderNumber: row.number,
                id: row.id,
                items: []
            };
        }
        
        orders[orderKey].items.push(row);
    });
    
    return orders;
}

// Calculate costs based on business rules
function calculateCosts(orders) {
    const results = Object.values(orders).map(order => {
        const qty = order.items.reduce((sum, item) => sum + (parseInt(item.quantity_shipped) || 0), 0);
        const unitCost = 6.30; // Always $6.30 per print
        const additionalShipping = qty === 1 ? 0.00 : 0.25; // $0.25 fee for multi-item orders
        const printsCost = qty * 6.30; // Base cost for prints
        const totalCost = printsCost + additionalShipping; // Total = prints + shipping fee
        
        // Get the shipped date from the first item (all items in same order have same shipped_at)
        const shippedAt = order.items[0].shipped_at;
        const shippedDate = new Date(shippedAt);
        
        return {
            orderNumber: order.orderNumber,
            qty: qty,
            unitCost: unitCost,
            additionalShipping: additionalShipping,
            printsCost: printsCost,
            totalCost: totalCost,
            shippedAt: shippedAt,
            shippedDate: shippedDate,
            simplifiedShipDate: shippedDate.toLocaleDateString('en-US', {
                month: '2-digit',
                day: '2-digit',
                year: 'numeric'
            })
        };
    });
    
    // Sort by shipped date, latest to oldest
    results.sort((a, b) => b.shippedDate - a.shippedDate);
    
    return results;
}

// Display results on the page
function displayResults(results, selectedMonth, selectedYear) {
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    // Calculate totals
    const totalPrints = results.reduce((sum, order) => sum + order.qty, 0);
    const totalAmount = results.reduce((sum, order) => sum + order.totalCost, 0);
    
    // Display summary
    const summaryContent = document.getElementById('summaryContent');
    summaryContent.innerHTML = `
        <div class="month-year-display">${monthNames[selectedMonth]} ${selectedYear}</div>
        <div class="summary-stats">
            <div class="stat-item">
                <div class="stat-value">${results.length}</div>
                <div class="stat-label">Total Orders</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${totalPrints}</div>
                <div class="stat-label">Total Prints</div>
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
                        <th>Additional Shipping</th>
                        <th>Total Cost</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    results.forEach(order => {
        tableHTML += `
            <tr>
                <td>${order.orderNumber}</td>
                <td>${order.simplifiedShipDate}</td>
                <td>${order.qty}</td>
                <td>$${order.unitCost.toFixed(2)}</td>
                <td>$${order.additionalShipping.toFixed(2)}</td>
                <td class="cost-cell">$${order.totalCost.toFixed(2)}</td>
            </tr>
        `;
    });
    
    tableHTML += `
                </tbody>
            </table>
        </div>
    `;
    
    ordersTableContent.innerHTML = tableHTML;
}

// Download Dimona Invoice (with $7.00 pricing)
function downloadDimonaInvoice() {
    if (processedResults.length === 0) {
        alert('No data to download. Please generate an invoice first.');
        return;
    }
    
    // Recalculate with $7.00 pricing for Dimona invoice
    const dimonaResults = processedResults.map(order => {
        const unitCost = 7.00;
        const printsCost = order.qty * 7.00;
        const additionalShipping = order.qty === 1 ? 0.00 : 0.25;
        const totalCost = printsCost + additionalShipping;
        
        return {
            ...order,
            unitCost: unitCost,
            printsCost: printsCost,
            totalCost: totalCost
        };
    });
    
    // Calculate totals with $7.00 pricing
    const totalPrints = dimonaResults.reduce((sum, order) => sum + order.qty, 0);
    const totalAmount = dimonaResults.reduce((sum, order) => sum + order.totalCost, 0);
    
    // Prepare data for Excel
    const excelData = [
        ['Dimona Invoice Summary'],
        ['Generated on:', new Date().toLocaleDateString()],
        [''],
        ['SUMMARY'],
        ['Total Orders:', dimonaResults.length],
        ['Total Prints:', totalPrints],
        ['Total Amount Owed:', totalAmount],
        [''],
        ['Order Number', 'Ship Date', 'Qty', 'Unit Cost', 'Additional Shipping', 'Total Cost']
    ];
    
    // Add order data
    dimonaResults.forEach(order => {
        excelData.push([
            order.orderNumber,
            order.simplifiedShipDate,
            order.qty,
            order.unitCost,
            order.additionalShipping,
            order.totalCost
        ]);
    });
    
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    
    // Style the header
    ws['A1'] = { v: 'Dimona Invoice Summary', t: 's', s: { font: { bold: true, sz: 16 } } };
    
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
    if (processedResults.length === 0) {
        alert('No data to download. Please generate an invoice first.');
        return;
    }
    
    // Use existing processedResults which already have $6.30 pricing
    const totalPrints = processedResults.reduce((sum, order) => sum + order.qty, 0);
    const totalAmount = processedResults.reduce((sum, order) => sum + order.totalCost, 0);
    
    // Prepare data for Excel
    const excelData = [
        ['Discounted Invoice Summary ($6.30)'],
        ['Generated on:', new Date().toLocaleDateString()],
        [''],
        ['SUMMARY'],
        ['Total Orders:', processedResults.length],
        ['Total Prints:', totalPrints],
        ['Total Amount Owed:', totalAmount],
        [''],
        ['Order Number', 'Ship Date', 'Qty', 'Unit Cost', 'Additional Shipping', 'Total Cost']
    ];
    
    // Add order data
    processedResults.forEach(order => {
        excelData.push([
            order.orderNumber,
            order.simplifiedShipDate,
            order.qty,
            order.unitCost,
            order.additionalShipping,
            order.totalCost
        ]);
    });
    
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
