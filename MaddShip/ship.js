let csvData = [];
let shippedItems = {};
let selectedCard = null;
let labelClickCount = {}; // Track clicks per order ID

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
            document.getElementById('viewUrlsSection').style.display = 'block';
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
        
        // Create image containers for ALL images
        let imageContainersHtml = '';
        googleDriveUrls.forEach((imageUrl, index) => {
            const fileId = extractFileId(imageUrl);
            const downloadUrl = `https://drive.usercontent.google.com/u/3/uc?id=${fileId}&export=download`;
            
            imageContainersHtml += `
                <div class="image-container" style="position: relative; margin-bottom: 10px;">
                    <div class="loading-thumbnail" id="loading_${order.id}_${index}" style="width: 100%; height: 150px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; border-radius: 8px; border: 1px solid #ddd;">
                        <div style="text-align: center; color: #666;">
                            <div class="spinner" style="width: 15px; height: 15px; margin: 0 auto 5px;"></div>
                            Loading ${index + 1}/${googleDriveUrls.length}...
                        </div>
                    </div>
                    <a href="${downloadUrl}" 
                       class="download-icon" 
                       download 
                       title="Download image ${index + 1}"
                       style="position: absolute; top: 8px; right: 8px; background: rgba(0,0,0,0.7); color: white; padding: 6px 8px; border-radius: 15px; text-decoration: none; font-size: 12px; z-index: 10;">
                        💾
                    </a>
                </div>
            `;
        });
        
        card.innerHTML = `
            <div class="card-image-container">
                ${imageContainersHtml}
            </div>
            <div class="card-info">
                <div class="card-order-number">Order #${order.number || order.id}</div>
                <div class="card-customer">${customerName}</div>
                <div class="card-images-count">${googleDriveUrls.length} image${googleDriveUrls.length > 1 ? 's' : ''}</div>
                <div class="card-status ${isShipped ? 'status-shipped' : 'status-pending'}">
                    ${isShipped ? '✅ SHIPPED' : '📦 PENDING'}
                </div>
            </div>
            <div class="card-buttons">
                <button class="label-button ${isShipped ? 'shipped' : ''}" onclick="handleLabelClick('${order.id}', '${order.number || order.id}', '${customerName.replace(/'/g, "\\'")}')">
                    ${isShipped ? 'SHIPPED' : 'LABEL'}
                </button>
                ${isShipped ? `
                    <button class="unship-button" onclick="handleUnshipClick('${order.id}', '${order.number || order.id}', '${customerName.replace(/'/g, "\\'")}')">
                        UNSHIP
                    </button>
                ` : ''}
            </div>
        `;
        
        // Add click handler for card selection
        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('label-button') || e.target.classList.contains('unship-button') || e.target.classList.contains('download-icon')) {
                return; // Don't select when clicking buttons or download icons
            }
            selectCard(card);
        });
        
        grid.appendChild(card);
        
        // Load all image previews
        googleDriveUrls.forEach((imageUrl, index) => {
            const fileId = extractFileId(imageUrl);
            loadMultipleImagePreviews(card, fileId, imageUrl, index, order.id);
        });
    });
}

// Load multiple image previews for a card
async function loadMultipleImagePreviews(card, fileId, imageUrl, index, orderId) {
    const loadingContainer = document.getElementById(`loading_${orderId}_${index}`);
    
    if (!loadingContainer) return;
    
    try {
        // Try to load thumbnail from API first
        const response = await fetch(`/api/get-thumbnails?fileId=${encodeURIComponent(fileId)}`);
        
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.thumbnails.length > 0) {
                loadingContainer.innerHTML = `
                    <img src="${data.thumbnails[0].url}" 
                         alt="Order preview ${index + 1}" 
                         style="width: 100%; height: 150px; object-fit: contain; border-radius: 8px; border: 1px solid #ddd; background: white;"
                         onerror="this.parentElement.innerHTML='<div style=\\'width: 100%; height: 150px; display: flex; align-items: center; justify-content: center; color: #666; border-radius: 8px; border: 1px solid #ddd;\\'>Preview not available</div>'">
                `;
                return;
            }
        }
        
        // Fallback to Google Drive preview
        const previewUrl = `https://drive.google.com/file/d/${fileId}/preview`;
        loadingContainer.innerHTML = `
            <iframe src="${previewUrl}" 
                    style="width: 100%; height: 150px; border-radius: 8px; border: 1px solid #ddd;"
                    frameborder="0">
            </iframe>
        `;
    } catch (error) {
        console.error('Error loading image preview:', error);
        loadingContainer.innerHTML = `
            <div style="width: 100%; height: 150px; display: flex; align-items: center; justify-content: center; color: #666; border-radius: 8px; border: 1px solid #ddd;">
                Preview not available
            </div>
        `;
    }
}

// Load image preview for a card (legacy function for compatibility)
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

// Get all orders for a customer
function getOrdersByCustomer(customerName) {
    return csvData.filter(order => {
        const firstName = order.shipping_address_first_name || '';
        const lastName = order.shipping_address_last_name || '';
        const fullName = `${firstName} ${lastName}`.trim();
        return fullName === customerName;
    });
}

// Handle label button click - immediate shipping with customer grouping
function handleLabelClick(orderId, orderNumber, customerName) {
    // Get all orders for this customer
    const customerOrders = getOrdersByCustomer(customerName);
    
    // Check if any orders for this customer are already shipped
    const anyShipped = customerOrders.some(order => shippedItems[order.id]);
    
    if (anyShipped) {
        // Show unship option for the entire customer group
        showShipUnshipModal(customerOrders, 'unship');
    } else {
        // Ship all orders for this customer immediately
        shipCustomerOrders(customerOrders);
        
        // Open Veeqo for the clicked order
        const veeqoUrl = `https://app.veeqo.com/orders/${orderId}`;
        window.open(veeqoUrl, '_blank');
    }
}

// Ship all orders for a customer
function shipCustomerOrders(customerOrders) {
    customerOrders.forEach(order => {
        const firstName = order.shipping_address_first_name || '';
        const lastName = order.shipping_address_last_name || '';
        const customerName = `${firstName} ${lastName}`.trim();
        
        shippedItems[order.id] = {
            timestamp: new Date().toISOString(),
            orderNumber: order.number || order.id,
            customerName: customerName,
            veeqoUrl: `https://app.veeqo.com/orders/${order.id}`
        };
    });
    
    // Save to localStorage
    saveShippedItems();
    
    // Update display
    applySortAndFilter();
}

// Unship all orders for a customer
function unshipCustomerOrders(customerOrders) {
    customerOrders.forEach(order => {
        delete shippedItems[order.id];
    });
    
    // Save to localStorage
    saveShippedItems();
    
    // Update display
    applySortAndFilter();
}

// Handle unship button click
function handleUnshipClick(orderId, orderNumber, customerName) {
    const customerOrders = getOrdersByCustomer(customerName);
    showShipUnshipModal(customerOrders, 'unship');
}

// Show ship/unship modal for customer groups
function showShipUnshipModal(customerOrders, action) {
    const modal = document.getElementById('warningModal');
    const warningDetails = document.getElementById('warningDetails');
    const proceedButton = document.getElementById('proceedButton');
    
    const customerName = customerOrders[0] ? 
        `${customerOrders[0].shipping_address_first_name || ''} ${customerOrders[0].shipping_address_last_name || ''}`.trim() : 
        'Unknown Customer';
    
    if (action === 'unship') {
        warningDetails.innerHTML = `
            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <strong>Unship Customer Orders</strong><br>
                Customer: ${customerName}<br>
                Orders to unship: ${customerOrders.length}<br><br>
                <div style="max-height: 150px; overflow-y: auto; background: #f8f9fa; padding: 10px; border-radius: 5px;">
                    ${customerOrders.map(order => `
                        <div style="margin-bottom: 5px;">
                            Order #${order.number || order.id} 
                            ${shippedItems[order.id] ? '(Currently Shipped)' : '(Pending)'}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        proceedButton.textContent = 'Unship All';
        proceedButton.style.background = '#dc3545';
        proceedButton.onclick = () => {
            unshipCustomerOrders(customerOrders);
            closeWarningModal();
        };
    } else {
        warningDetails.innerHTML = `
            <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <strong>Ship Customer Orders</strong><br>
                Customer: ${customerName}<br>
                Orders to ship: ${customerOrders.length}
            </div>
        `;
        
        proceedButton.textContent = 'Ship All';
        proceedButton.style.background = '#28a745';
        proceedButton.onclick = () => {
            shipCustomerOrders(customerOrders);
            closeWarningModal();
        };
    }
    
    modal.style.display = 'flex';
}

// Show warning modal (legacy function for compatibility)
function showWarningModal(orderId, orderNumber, customerName, alreadyShipped) {
    const customerOrders = getOrdersByCustomer(customerName);
    showShipUnshipModal(customerOrders, alreadyShipped ? 'unship' : 'ship');
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
