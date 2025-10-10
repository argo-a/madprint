let csvData = [];
let shippedItems = {};
let selectedCard = null;
let labelClickCount = {}; // Track clicks per order ID
let sidebarCollapsed = false;
let searchTerm = '';
let currentGridMode = 'medium';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('csvFile').addEventListener('change', handleFileUpload);
    
    // Load persistent data from localStorage
    loadShippedItems();
    loadLastSession();
    
    // Add event listeners for sorting and filtering
    document.querySelectorAll('input[name="sortBy"]').forEach(radio => {
        radio.addEventListener('change', applySortAndFilter);
    });
    
    document.getElementById('hideShipped').addEventListener('change', applySortAndFilter);
    
    // Add search functionality
    const searchInput = document.getElementById('searchInput');
    const clearSearch = document.getElementById('clearSearch');
    
    searchInput.addEventListener('input', handleSearchInput);
    searchInput.addEventListener('keydown', handleSearchKeydown);
    clearSearch.addEventListener('click', clearSearchInput);
    
    // Add grid view controls
    document.querySelectorAll('.grid-btn').forEach(btn => {
        btn.addEventListener('click', handleGridModeChange);
    });
    
    // Load sidebar and grid state
    loadSidebarState();
    loadGridMode();
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
    
    // First clean the notes text to remove [@...] patterns
    const cleanedNotes = notes.replace(/\[@[^\]]+\]\s*/g, '');
    
    // Updated regex to accept both drive_link and sharing formats
    const driveUrlRegex = /https:\/\/drive\.google\.com\/file\/d\/[a-zA-Z0-9_-]+\/view\?usp=(drive_link|sharing)/g;
    const matches = cleanedNotes.match(driveUrlRegex);
    
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

// Consolidate orders by unique order ID only (not by customer name)
function consolidateOrders(orders) {
    const consolidated = {};
    
    orders.forEach(order => {
        const firstName = order.shipping_address_first_name || '';
        const lastName = order.shipping_address_last_name || '';
        const customerName = `${firstName} ${lastName}`.trim() || 'Unknown Customer';
        const orderNumber = order.number || order.id;
        
        // Use order ID as the unique key - each order ID is a separate card
        const key = order.id;
        
        if (!consolidated[key]) {
            consolidated[key] = {
                ...order,
                customerName: customerName,
                orderNumber: orderNumber,
                allOrderIds: [order.id],
                allGoogleDriveUrls: extractGoogleDriveUrls(order.notes || '')
            };
        } else {
            // This should rarely happen (duplicate order IDs in CSV)
            // But if it does, merge the URLs
            const additionalUrls = extractGoogleDriveUrls(order.notes || '');
            
            // Deduplicate URLs by creating a Set and converting back to array
            const allUrls = [...consolidated[key].allGoogleDriveUrls, ...additionalUrls];
            consolidated[key].allGoogleDriveUrls = [...new Set(allUrls)];
        }
    });
    
    return Object.values(consolidated);
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
    
    // Consolidate orders by order number and customer
    const consolidatedOrders = consolidateOrders(orders);
    
    grid.innerHTML = '';
    
    consolidatedOrders.forEach(consolidatedOrder => {
        const googleDriveUrls = consolidatedOrder.allGoogleDriveUrls;
        
        // Check if any of the order IDs are shipped
        const isShipped = consolidatedOrder.allOrderIds.some(orderId => shippedItems[orderId]);
        const customerName = consolidatedOrder.customerName;
        
        const card = document.createElement('div');
        card.className = `shipping-card ${isShipped ? 'shipped' : ''}`;
        card.dataset.orderId = consolidatedOrder.allOrderIds[0]; // Use first order ID as primary
        card.dataset.allOrderIds = JSON.stringify(consolidatedOrder.allOrderIds);
        
        // Create image containers for ALL images from all consolidated orders
        let imageContainersHtml = '';
        
        if (googleDriveUrls.length === 0) {
            // Show placeholder for orders without valid URLs
            imageContainersHtml = `
                <div class="image-container" style="position: relative; margin-bottom: 10px;">
                    <div style="width: 100%; height: 150px; background: #fff3cd; display: flex; align-items: center; justify-content: center; border-radius: 8px; border: 2px dashed #ffc107; color: #856404;">
                        <div style="text-align: center; padding: 20px;">
                            <div style="font-size: 2rem; margin-bottom: 10px;">⚠️</div>
                            <div style="font-weight: bold; margin-bottom: 5px;">No Images / Bad URL</div>
                            <div style="font-size: 0.8rem;">Check order notes for URL issues</div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            googleDriveUrls.forEach((imageUrl, index) => {
            const fileId = extractFileId(imageUrl);
                const downloadUrl = `https://drive.usercontent.google.com/u/3/uc?id=${fileId}&export=download`;
                
                imageContainersHtml += `
                    <div class="image-container" style="position: relative; margin-bottom: 10px;">
                        <div class="loading-thumbnail" id="loading_${consolidatedOrder.allOrderIds[0]}_${index}" style="width: 100%; height: 150px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; border-radius: 8px; border: 1px solid #ddd;">
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
        }
        
        card.innerHTML = `
            <div class="card-image-container ${googleDriveUrls.length === 1 ? 'single-image' : 'multiple-images'}">
                ${imageContainersHtml}
            </div>
            <div class="card-content">
                <div class="card-details">
                    <div class="card-order-number">Order #${consolidatedOrder.orderNumber}</div>
                    <div class="card-customer">${customerName}</div>
                    <div class="card-images-count">${googleDriveUrls.length} image${googleDriveUrls.length > 1 ? 's' : ''}</div>
                    ${consolidatedOrder.allOrderIds.length > 1 ? `<div class="card-sub-orders">${consolidatedOrder.allOrderIds.length} sub-orders</div>` : ''}
                    <div class="card-status ${isShipped ? 'status-shipped' : 'status-pending'}">
                        ${isShipped ? '✅ SHIPPED' : '📦 PENDING'}
                    </div>
                </div>
                <div class="card-actions">
                    <button class="label-button ${isShipped ? 'shipped' : ''}" onclick="handleConsolidatedLabelClick('${JSON.stringify(consolidatedOrder.allOrderIds).replace(/'/g, "\\'")}', '${consolidatedOrder.orderNumber}', '${customerName.replace(/'/g, "\\'")}')">
                        ${isShipped ? 'SHIPPED' : 'LABEL'}
                    </button>
                    ${isShipped ? `
                        <button class="unship-button" onclick="handleConsolidatedUnshipClick('${JSON.stringify(consolidatedOrder.allOrderIds).replace(/'/g, "\\'")}', '${consolidatedOrder.orderNumber}', '${customerName.replace(/'/g, "\\'")}')">
                            UNSHIP
                        </button>
                    ` : ''}
                </div>
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
            loadMultipleImagePreviews(card, fileId, imageUrl, index, consolidatedOrder.allOrderIds[0]);
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

// Handle consolidated label button click
function handleConsolidatedLabelClick(allOrderIdsJson, orderNumber, customerName) {
    const allOrderIds = JSON.parse(allOrderIdsJson);
    
    // Check if any orders are already shipped
    const anyShipped = allOrderIds.some(orderId => shippedItems[orderId]);
    
    if (anyShipped) {
        // Show unship option for all consolidated orders
        const customerOrders = csvData.filter(order => allOrderIds.includes(order.id));
        showShipUnshipModal(customerOrders, 'unship');
    } else {
        // Ship all consolidated orders immediately
        const customerOrders = csvData.filter(order => allOrderIds.includes(order.id));
        shipCustomerOrders(customerOrders);
        
        // Open Veeqo for the first order
        const veeqoUrl = `https://app.veeqo.com/orders/${allOrderIds[0]}`;
        window.open(veeqoUrl, '_blank');
    }
}

// Handle consolidated unship button click
function handleConsolidatedUnshipClick(allOrderIdsJson, orderNumber, customerName) {
    const allOrderIds = JSON.parse(allOrderIdsJson);
    const customerOrders = csvData.filter(order => allOrderIds.includes(order.id));
    showShipUnshipModal(customerOrders, 'unship');
}

// Handle unship button click (legacy)
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

// Persistent Data Storage Functions
function saveLastSession() {
    const sessionData = {
        csvData: csvData,
        timestamp: new Date().toISOString(),
        fileName: document.getElementById('csvFile').files[0]?.name || 'Unknown File'
    };
    localStorage.setItem('maddShipLastSession', JSON.stringify(sessionData));
}

function loadLastSession() {
    const stored = localStorage.getItem('maddShipLastSession');
    if (stored) {
        try {
            const sessionData = JSON.parse(stored);
            if (sessionData.csvData && sessionData.csvData.length > 0) {
                csvData = sessionData.csvData;
                
                // Show success message
                const uploadStatus = document.getElementById('uploadStatus');
                uploadStatus.innerHTML = `<div class="success-message">✅ Restored session: ${sessionData.fileName} (${csvData.length} orders)</div>`;
                
                // Show control sections
                document.getElementById('statsSection').style.display = 'block';
                document.getElementById('viewUrlsSection').style.display = 'block';
                document.getElementById('sortSection').style.display = 'block';
                document.getElementById('filterSection').style.display = 'block';
                document.getElementById('searchContainer').style.display = 'block';
                document.getElementById('headerStats').style.display = 'flex';
                
                // Update display
                updateStatistics();
                updateHeaderStats();
                applySortAndFilter();
            }
        } catch (error) {
            console.error('Error loading last session:', error);
        }
    }
}

// Enhanced Search Functions for Barcode Scanning
function handleSearchInput(event) {
    const value = event.target.value.trim();
    const clearButton = document.getElementById('clearSearch');
    
    // Show/hide clear button based on input
    if (value) {
        clearButton.style.display = 'block';
    } else {
        clearButton.style.display = 'none';
        clearAllHighlights();
    }
}

function handleSearchKeydown(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        const searchValue = event.target.value.trim();
        
        if (searchValue) {
            performBarcodeSearch(searchValue);
        }
    }
}

function performBarcodeSearch(searchValue) {
    const searchLower = searchValue.toLowerCase();
    const cards = document.querySelectorAll('.shipping-card');
    let foundCard = null;
    
    // Clear any existing highlights
    clearAllHighlights();
    
    // Search for exact or partial matches
    cards.forEach(card => {
        const orderNumber = card.querySelector('.card-order-number')?.textContent.toLowerCase() || '';
        const customerName = card.querySelector('.card-customer')?.textContent.toLowerCase() || '';
        
        // Check for exact match first, then partial match
        const exactOrderMatch = orderNumber.includes(`#${searchLower}`) || orderNumber.includes(searchLower);
        const partialMatch = orderNumber.includes(searchLower) || customerName.includes(searchLower);
        
        if (exactOrderMatch || partialMatch) {
            if (!foundCard) {
                foundCard = card;
            }
        }
    });
    
    if (foundCard) {
        // Highlight and scroll to the found card
        highlightFoundCard(foundCard);
        showSearchResult(true, searchValue);
        
        // Auto-clear search field after a short delay for next scan
        setTimeout(() => {
            clearSearchInput();
        }, 2000);
    } else {
        // Show not found message
        showSearchResult(false, searchValue);
        
        // Auto-clear search field after showing message
        setTimeout(() => {
            clearSearchInput();
        }, 3000);
    }
}

function highlightFoundCard(card) {
    // Add highlight class
    card.classList.add('search-highlighted');
    
    // Scroll to the card
    card.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
    });
    
    // Select the card
    selectCard(card);
    
    // Remove highlight after a few seconds
    setTimeout(() => {
        card.classList.remove('search-highlighted');
    }, 5000);
}

function clearAllHighlights() {
    const highlightedCards = document.querySelectorAll('.search-highlighted');
    highlightedCards.forEach(card => {
        card.classList.remove('search-highlighted');
    });
    
    // Remove any search result messages
    const existingMessage = document.querySelector('.search-result-message');
    if (existingMessage) {
        existingMessage.remove();
    }
}

function showSearchResult(found, searchValue) {
    // Remove any existing search result message
    const existingMessage = document.querySelector('.search-result-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // Create new search result message
    const message = document.createElement('div');
    message.className = 'search-result-message';
    message.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        z-index: 1001;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        font-weight: 600;
        max-width: 300px;
    `;
    
    if (found) {
        message.style.background = '#28a745';
        message.style.color = 'white';
        message.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 1.2rem;">✅</span>
                <div>
                    <div>Found!</div>
                    <div style="font-size: 0.9rem; opacity: 0.9;">${searchValue}</div>
                </div>
            </div>
        `;
    } else {
        message.style.background = '#dc3545';
        message.style.color = 'white';
        message.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 1.2rem;">❌</span>
                <div>
                    <div>Not Found</div>
                    <div style="font-size: 0.9rem; opacity: 0.9;">${searchValue} not in list</div>
                </div>
            </div>
        `;
    }
    
    document.body.appendChild(message);
    
    // Remove message after delay
    setTimeout(() => {
        if (document.body.contains(message)) {
            document.body.removeChild(message);
        }
    }, found ? 2000 : 3000);
}

// Legacy search function (kept for compatibility)
function handleSearch(event) {
    searchTerm = event.target.value.toLowerCase().trim();
    const clearButton = document.getElementById('clearSearch');
    
    if (searchTerm) {
        clearButton.style.display = 'block';
        filterBySearch();
    } else {
        clearButton.style.display = 'none';
        clearSearchFilter();
    }
}

function clearSearchInput() {
    document.getElementById('searchInput').value = '';
    document.getElementById('clearSearch').style.display = 'none';
    searchTerm = '';
    clearSearchFilter();
}

function filterBySearch() {
    const cards = document.querySelectorAll('.shipping-card');
    let visibleCount = 0;
    
    cards.forEach(card => {
        const orderNumber = card.querySelector('.card-order-number')?.textContent.toLowerCase() || '';
        const customerName = card.querySelector('.card-customer')?.textContent.toLowerCase() || '';
        
        const matches = orderNumber.includes(searchTerm) || customerName.includes(searchTerm);
        
        if (matches) {
            card.classList.remove('filtered');
            card.style.display = 'block';
            visibleCount++;
        } else {
            card.classList.add('filtered');
            card.style.display = 'none';
        }
    });
    
    // Show message if no results
    const grid = document.getElementById('shippingGrid');
    const existingMessage = grid.querySelector('.search-no-results');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    if (visibleCount === 0 && searchTerm) {
        const noResultsMessage = document.createElement('div');
        noResultsMessage.className = 'search-no-results placeholder-message';
        noResultsMessage.innerHTML = `
            <div style="font-size: 2rem; margin-bottom: 15px;">🔍</div>
            <h3 style="margin-bottom: 10px; color: #333;">No Results Found</h3>
            <p>No orders match "${searchTerm}". Try a different search term.</p>
        `;
        grid.appendChild(noResultsMessage);
    }
}

function clearSearchFilter() {
    const cards = document.querySelectorAll('.shipping-card');
    cards.forEach(card => {
        card.classList.remove('filtered');
        card.style.display = 'block';
    });
    
    // Remove no results message
    const noResultsMessage = document.querySelector('.search-no-results');
    if (noResultsMessage) {
        noResultsMessage.remove();
    }
}

// Sidebar Toggle Functions
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const rightColumn = document.querySelector('.right-column');
    const grid = document.getElementById('shippingGrid');
    const toggleIcon = document.getElementById('sidebarToggleIcon');
    
    sidebarCollapsed = !sidebarCollapsed;
    
    if (sidebarCollapsed) {
        sidebar.classList.add('collapsed');
        rightColumn.classList.add('full-width');
        grid.classList.add('sidebar-collapsed');
        toggleIcon.textContent = '▶';
    } else {
        sidebar.classList.remove('collapsed');
        rightColumn.classList.remove('full-width');
        grid.classList.remove('sidebar-collapsed');
        toggleIcon.textContent = '◀';
    }
    
    // Save sidebar state
    saveSidebarState();
    
    // Trigger grid recalculation
    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
    }, 300);
}

function saveSidebarState() {
    localStorage.setItem('maddShipSidebarCollapsed', JSON.stringify(sidebarCollapsed));
}

function loadSidebarState() {
    const stored = localStorage.getItem('maddShipSidebarCollapsed');
    if (stored) {
        const wasCollapsed = JSON.parse(stored);
        if (wasCollapsed && !sidebarCollapsed) {
            toggleSidebar();
        }
    }
}

// Enhanced Statistics Functions
function updateHeaderStats() {
    const totalCount = csvData.length;
    const shippedCount = Object.keys(shippedItems).length;
    const pendingCount = totalCount - shippedCount;
    
    document.getElementById('headerTotalCount').textContent = `${totalCount} Total`;
    document.getElementById('headerShippedCount').textContent = `${shippedCount} Shipped`;
    document.getElementById('headerPendingCount').textContent = `${pendingCount} Pending`;
}

// Override the original updateStatistics to also update header
const originalUpdateStatistics = updateStatistics;
updateStatistics = function() {
    originalUpdateStatistics();
    updateHeaderStats();
};

// Override handleFileUpload to save session and show search
const originalHandleFileUpload = handleFileUpload;
handleFileUpload = function(event) {
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
            document.getElementById('searchContainer').style.display = 'block';
            document.getElementById('headerStats').style.display = 'flex';
            
            // Save session data
            saveLastSession();
            
            // Update statistics and display grid
            updateStatistics();
            applySortAndFilter();
        },
        error: function(error) {
            uploadStatus.innerHTML = `<div class="error-message">Error reading file: ${error.message}</div>`;
        }
    });
};

// Grid Mode Functions
function handleGridModeChange(event) {
    const newMode = event.target.dataset.grid;
    if (newMode === currentGridMode) return;
    
    // Update active button
    document.querySelectorAll('.grid-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Update grid mode
    currentGridMode = newMode;
    applyGridMode();
    saveGridMode();
}

function applyGridMode() {
    const grid = document.getElementById('shippingGrid');
    
    // Remove all grid mode classes
    grid.classList.remove('grid-small', 'grid-medium', 'grid-large', 'grid-list');
    
    // Apply new grid mode class
    if (currentGridMode !== 'medium') {
        grid.classList.add(`grid-${currentGridMode}`);
    }
    
    // Show/hide grid controls when data is loaded
    if (csvData.length > 0) {
        document.getElementById('gridControls').style.display = 'flex';
    }
}

function saveGridMode() {
    localStorage.setItem('maddShipGridMode', currentGridMode);
}

function loadGridMode() {
    const stored = localStorage.getItem('maddShipGridMode');
    if (stored && stored !== currentGridMode) {
        currentGridMode = stored;
        
        // Update active button
        document.querySelectorAll('.grid-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.grid === currentGridMode) {
                btn.classList.add('active');
            }
        });
        
        applyGridMode();
    }
}

// Download All Images Function - Fixed to use deduplicated URLs
function downloadAllImages(deduplicatedUrls, customerName, orderNumber) {
    const allUrls = [];
    
    // Use the deduplicated URLs directly instead of re-extracting from CSV
    deduplicatedUrls.forEach((url, index) => {
        const fileId = extractFileId(url);
        if (fileId) {
            allUrls.push({
                url: `https://drive.usercontent.google.com/u/3/uc?id=${fileId}&export=download`,
                filename: `${customerName}_${orderNumber}_${index + 1}_${fileId}.jpg`
            });
        }
    });
    
    // Download each file with a small delay to avoid overwhelming the browser
    allUrls.forEach((file, index) => {
        setTimeout(() => {
            const link = document.createElement('a');
            link.href = file.url;
            link.download = file.filename;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }, index * 500); // 500ms delay between downloads
    });
    
    // Show notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        z-index: 1001;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    notification.textContent = `Downloading ${allUrls.length} images for ${customerName}...`;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        document.body.removeChild(notification);
    }, 3000);
}

// Enhanced Display Function with Download All Button
function updateDisplayShippingGrid() {
    // Show grid controls when data is loaded
    if (csvData.length > 0) {
        document.getElementById('gridControls').style.display = 'flex';
        applyGridMode();
    }
}

// Override the original displayShippingGrid to add download all functionality
const originalDisplayShippingGrid = displayShippingGrid;
displayShippingGrid = function(orders) {
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
    
    // Consolidate orders by order number and customer
    const consolidatedOrders = consolidateOrders(orders);
    
    grid.innerHTML = '';
    
    consolidatedOrders.forEach(consolidatedOrder => {
        const googleDriveUrls = consolidatedOrder.allGoogleDriveUrls;
        
        if (googleDriveUrls.length === 0) return; // Skip orders without images
        
        // Check if any of the order IDs are shipped
        const isShipped = consolidatedOrder.allOrderIds.some(orderId => shippedItems[orderId]);
        const customerName = consolidatedOrder.customerName;
        
        const card = document.createElement('div');
        card.className = `shipping-card ${isShipped ? 'shipped' : ''}`;
        card.dataset.orderId = consolidatedOrder.allOrderIds[0]; // Use first order ID as primary
        card.dataset.allOrderIds = JSON.stringify(consolidatedOrder.allOrderIds);
        
        // Create image containers for ALL images from all consolidated orders
        let imageContainersHtml = '';
        googleDriveUrls.forEach((imageUrl, index) => {
            const fileId = extractFileId(imageUrl);
            const downloadUrl = `https://drive.usercontent.google.com/u/3/uc?id=${fileId}&export=download`;
            
            imageContainersHtml += `
                <div class="image-container" style="position: relative; margin-bottom: 8px;">
                    <div class="loading-thumbnail" id="loading_${consolidatedOrder.allOrderIds[0]}_${index}" style="width: 100%; height: 300px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; border-radius: 8px; border: 1px solid #ddd;">
                        <div style="text-align: center; color: #666;">
                            <div class="spinner" style="width: 15px; height: 15px; margin: 0 auto 5px;"></div>
                            Loading ${index + 1}/${googleDriveUrls.length}...
                        </div>
                    </div>
                    <a href="${downloadUrl}" 
                       class="download-icon" 
                       download 
                       title="Download image ${index + 1}">
                        💾
                    </a>
                    ${index === 0 && googleDriveUrls.length > 1 ? `
                        <button class="download-all-btn" 
                                onclick="downloadAllImages(${JSON.stringify(googleDriveUrls)}, '${customerName.replace(/'/g, "\\'")}', '${consolidatedOrder.orderNumber}');"
                                title="Download all ${googleDriveUrls.length} images">
                            📥 All
                        </button>
                    ` : ''}
                </div>
            `;
        });
        
        card.innerHTML = `
            <div class="card-image-container">
                ${imageContainersHtml}
            </div>
            <div class="card-info">
                <div class="card-order-number">Order #${consolidatedOrder.orderNumber}</div>
                <div class="card-customer">${customerName}</div>
                <div class="card-images-count">${googleDriveUrls.length} image${googleDriveUrls.length > 1 ? 's' : ''}</div>
                ${consolidatedOrder.allOrderIds.length > 1 ? `<div class="card-sub-orders">${consolidatedOrder.allOrderIds.length} sub-orders</div>` : ''}
                <div class="card-status ${isShipped ? 'status-shipped' : 'status-pending'}">
                    ${isShipped ? '✅ SHIPPED' : '📦 PENDING'}
                </div>
            </div>
            <div class="card-buttons">
                <button class="label-button ${isShipped ? 'shipped' : ''}" onclick="handleConsolidatedLabelClick('${JSON.stringify(consolidatedOrder.allOrderIds).replace(/'/g, "\\'")}', '${consolidatedOrder.orderNumber}', '${customerName.replace(/'/g, "\\'")}')">
                    ${isShipped ? 'SHIPPED' : 'LABEL'}
                </button>
                ${isShipped ? `
                    <button class="unship-button" onclick="handleConsolidatedUnshipClick('${JSON.stringify(consolidatedOrder.allOrderIds).replace(/'/g, "\\'")}', '${consolidatedOrder.orderNumber}', '${customerName.replace(/'/g, "\\'")}')">
                        UNSHIP
                    </button>
                ` : ''}
            </div>
        `;
        
        // Add click handler for card selection
        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('label-button') || 
                e.target.classList.contains('unship-button') || 
                e.target.classList.contains('download-icon') ||
                e.target.classList.contains('download-all-btn')) {
                return; // Don't select when clicking buttons or download icons
            }
            selectCard(card);
        });
        
        grid.appendChild(card);
        
        // Load all image previews
        googleDriveUrls.forEach((imageUrl, index) => {
            const fileId = extractFileId(imageUrl);
            loadMultipleImagePreviews(card, fileId, imageUrl, index, consolidatedOrder.allOrderIds[0]);
        });
    });
    
    // Apply current grid mode and show controls
    updateDisplayShippingGrid();
};

// Close modal when clicking outside
document.getElementById('warningModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeWarningModal();
    }
});
