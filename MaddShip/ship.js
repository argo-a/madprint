let csvData = [];
let shippedItems = {};
let selectedCard = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('csvFile').addEventListener('change', handleFileUpload);
    
    // Load shipped items from localStorage
    loadShippedItems();
    
    // Add event listeners for sorting and filtering
    document.querySelectorAll('input[name="sortBy"]').forEach(radio => {
        radio.addEventListener('change', applySortAndFilter);
    });
    
    document.getElementById('hideShipped').addEventListener('change', applySortAndFilter);
});

// Load shipped items from localStorage
function loadShippedItems() {
    const stored = localStorage.getItem('maddShipShippedItems');
    if (stored) {
        shippedItems = JSON.parse(stored);
    }
}

// Save shipped items to localStorage
function saveShippedItems() {
    localStorage.setItem('maddShipShippedItems', JSON.stringify(shippedItems));
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
            
            uploadStatus.innerHTML = `<div class="success-message">✅ Successfully loaded ${csvData.length} orders!</div>`;
            
            // Show control sections
            document.getElementById('statsSection').style.display = 'block';
            document.getElementById('sortSection').style.display = 'block';
            document.getElementById('filterSection').style.display = 'block';
            
            // Update statistics and display grid
            updateStatistics();
            applySortAndFilter();
        },
        error: function(error) {
            uploadStatus.innerHTML = `<div class="error-message">Error reading file: ${error.message}</div>`;
        }
    });
}

// Extract Google Drive URLs from notes
function extractGoogleDriveUrls(notes) {
    if (!notes) return [];
    
    const driveUrlRegex = /https:\/\/drive\.google\.com\/file\/d\/[a-zA-Z0-9_-]+\/view\?usp=drive_link/g;
    const matches = notes.match(driveUrlRegex);
    
    return matches || [];
}

// Extract file ID from Google Drive URL
function extractFileId(driveUrl) {
    const fileIdMatch = driveUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)\//);
    return fileIdMatch ? fileIdMatch[1] : null;
}

// Get first Google Drive file ID for sorting
function getFirstImageId(order) {
    const urls = extractGoogleDriveUrls(order.notes || '');
    if (urls.length > 0) {
        return extractFileId(urls[0]) || '';
    }
    return '';
}

// Sort orders based on selected criteria
function sortOrders(orders) {
    const sortBy = document.querySelector('input[name="sortBy"]:checked').value;
    
    if (sortBy === 'date') {
        return orders.sort((a, b) => {
            const dateA = new Date(a.created_at || 0);
            const dateB = new Date(b.created_at || 0);
            return dateA - dateB; // Oldest first
        });
    } else if (sortBy === 'imageId') {
        return orders.sort((a, b) => {
            const idA = getFirstImageId(a);
            const idB = getFirstImageId(b);
            return idA.localeCompare(idB);
        });
    }
    
    return orders;
}

// Filter orders based on shipped status
function filterOrders(orders) {
    const hideShipped = document.getElementById('hideShipped').checked;
    
    if (hideShipped) {
        return orders.filter(order => !shippedItems[order.id]);
    }
    
    return orders;
}

// Apply sorting and filtering, then update display
function applySortAndFilter() {
    if (csvData.length === 0) return;
    
    let processedOrders = [...csvData];
    processedOrders = sortOrders(processedOrders);
    processedOrders = filterOrders(processedOrders);
    
    displayShippingGrid(processedOrders);
    updateStatistics();
}

// Update statistics display
function updateStatistics() {
    const totalCount = csvData.length;
    const shippedCount = Object.keys(shippedItems).length;
    const pendingCount = totalCount - shippedCount;
    
    document.getElementById('totalCount').textContent = totalCount;
    document.getElementById('shippedCount').textContent = shippedCount;
    document.getElementById('pendingCount').textContent = pendingCount;
}

// Display shipping grid
function displayShippingGrid(orders) {
    const grid = document.getElementById('shippingGrid');
    
    if (orders.length === 0) {
        grid.innerHTML = `
            <div class="placeholder-message">
                <div style="font-size: 3rem; margin-bottom: 20px;">📦</div>
                <h3 style="margin-bottom: 10px; color: #333;">No Orders to Display</h3>
                <p>All orders are filtered out or no data available.</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = '';
    
    orders.forEach(order => {
        const googleDriveUrls = extractGoogleDriveUrls(order.notes || '');
        
        if (googleDriveUrls.length === 0) return; // Skip orders without images
        
        const isShipped = shippedItems[order.id];
        const firstName = order.shipping_address_first_name || '';
        const lastName = order.shipping_address_last_name || '';
        const customerName = `${firstName} ${lastName}`.trim() || 'Unknown Customer';
        
        const card = document.createElement('div');
        card.className = `shipping-card ${isShipped ? 'shipped' : ''}`;
        card.dataset.orderId = order.id;
        
        // Use first image for display
        const firstImageUrl = googleDriveUrls[0];
        const fileId = extractFileId(firstImageUrl);
        
        card.innerHTML = `
            <div class="card-image-container">
                <div class="loading-thumbnail" style="width: 100%; height: 200px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; border-radius: 8px; border: 1px solid #ddd;">
                    <div style="text-align: center; color: #666;">
                        <div class="spinner" style="width: 20px; height: 20px; margin: 0 auto 10px;"></div>
                        Loading preview...
                    </div>
                </div>
            </div>
            <div class="card-info">
                <div class="card-order-number">Order #${order.number || order.id}</div>
                <div class="card-customer">${customerName}</div>
                <div class="card-status ${isShipped ? 'status-shipped' : 'status-pending'}">
                    ${isShipped ? '✅ SHIPPED' : '📦 PENDING'}
                </div>
            </div>
            <button class="label-button ${isShipped ? 'shipped' : ''}" onclick="handleLabelClick('${order.id}', '${order.number || order.id}', '${customerName.replace(/'/g, "\\'")}')">
                ${isShipped ? 'SHIPPED' : 'LABEL'}
            </button>
        `;
        
        // Add click handler for card selection
        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('label-button')) return; // Don't select when clicking button
            selectCard(card);
        });
        
        grid.appendChild(card);
        
        // Load image preview
        loadImagePreview(card, fileId, firstImageUrl);
    });
}

// Load image preview for a card
async function loadImagePreview(card, fileId, imageUrl) {
    const container = card.querySelector('.card-image-container');
    
    try {
        // Try to load thumbnail from API first
        const response = await fetch(`/api/get-thumbnails?fileId=${encodeURIComponent(fileId)}`);
        
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.thumbnails.length > 0) {
                container.innerHTML = `
                    <img src="${data.thumbnails[0].url}" 
                         alt="Order preview" 
                         class="card-image"
                         onerror="this.parentElement.innerHTML='<div class=\\'card-image\\' style=\\'display: flex; align-items: center; justify-content: center; color: #666;\\'>Preview not available</div>'">
                `;
                return;
            }
        }
        
        // Fallback to Google Drive preview
        const previewUrl = `https://drive.google.com/file/d/${fileId}/preview`;
        container.innerHTML = `
            <iframe src="${previewUrl}" 
                    class="card-image" 
                    frameborder="0"
                    style="width: 100%; height: 200px; border-radius: 8px; border: 1px solid #ddd;">
            </iframe>
        `;
    } catch (error) {
        console.error('Error loading image preview:', error);
        container.innerHTML = `
            <div class="card-image" style="display: flex; align-items: center; justify-content: center; color: #666;">
                Preview not available
            </div>
        `;
    }
}

// Select a card
function selectCard(card) {
    // Remove previous selection
    if (selectedCard) {
        selectedCard.classList.remove('selected');
    }
    
    // Select new card
    selectedCard = card;
    card.classList.add('selected');
}

// Handle label button click
function handleLabelClick(orderId, orderNumber, customerName) {
    const isAlreadyShipped = shippedItems[orderId];
    
    if (isAlreadyShipped) {
        // Show warning for already shipped item
        showWarningModal(orderId, orderNumber, customerName, true);
    } else {
        // Show warning for new shipment
        showWarningModal(orderId, orderNumber, customerName, false);
    }
}

// Show warning modal
function showWarningModal(orderId, orderNumber, customerName, alreadyShipped) {
    const modal = document.getElementById('warningModal');
    const warningDetails = document.getElementById('warningDetails');
    const proceedButton = document.getElementById('proceedButton');
    
    if (alreadyShipped) {
        const shippedInfo = shippedItems[orderId];
        const shippedDate = new Date(shippedInfo.timestamp).toLocaleString();
        
        warningDetails.innerHTML = `
            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <strong>Order Details:</strong><br>
                Order: ${orderNumber}<br>
                Customer: ${customerName}<br>
                <strong>Previously shipped:</strong> ${shippedDate}
            </div>
        `;
    } else {
        warningDetails.innerHTML = `
            <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <strong>Order Details:</strong><br>
                Order: ${orderNumber}<br>
                Customer: ${customerName}
            </div>
        `;
    }
    
    // Set up proceed button
    proceedButton.onclick = () => {
        proceedToLabel(orderId, orderNumber, customerName);
    };
    
    modal.style.display = 'flex';
}

// Close warning modal
function closeWarningModal() {
    document.getElementById('warningModal').style.display = 'none';
}

// Proceed to create label
function proceedToLabel(orderId, orderNumber, customerName) {
    // Mark as shipped
    shippedItems[orderId] = {
        timestamp: new Date().toISOString(),
        orderNumber: orderNumber,
        customerName: customerName,
        veeqoUrl: `https://app.veeqo.com/orders/${orderId}`
    };
    
    // Save to localStorage
    saveShippedItems();
    
    // Close modal
    closeWarningModal();
    
    // Update display
    applySortAndFilter();
    
    // Open Veeqo in new tab
    const veeqoUrl = `https://app.veeqo.com/orders/${orderId}`;
    window.open(veeqoUrl, '_blank');
}

// Keyboard navigation
document.addEventListener('keydown', function(e) {
    if (!selectedCard) return;
    
    const cards = Array.from(document.querySelectorAll('.shipping-card'));
    const currentIndex = cards.indexOf(selectedCard);
    
    let newIndex = currentIndex;
    
    switch(e.key) {
        case 'ArrowLeft':
            newIndex = Math.max(0, currentIndex - 1);
            break;
        case 'ArrowRight':
            newIndex = Math.min(cards.length - 1, currentIndex + 1);
            break;
        case 'ArrowUp':
            // Move up one row (assuming 4 columns)
            newIndex = Math.max(0, currentIndex - 4);
            break;
        case 'ArrowDown':
            // Move down one row (assuming 4 columns)
            newIndex = Math.min(cards.length - 1, currentIndex + 4);
            break;
        case 'Enter':
        case ' ':
            // Trigger label button
            const labelButton = selectedCard.querySelector('.label-button');
            if (labelButton) {
                labelButton.click();
            }
            e.preventDefault();
            break;
        default:
            return;
    }
    
    if (newIndex !== currentIndex && cards[newIndex]) {
        selectCard(cards[newIndex]);
        cards[newIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    e.preventDefault();
});

// Close modal when clicking outside
document.getElementById('warningModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeWarningModal();
    }
});
