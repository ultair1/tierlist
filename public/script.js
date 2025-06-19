document.addEventListener('DOMContentLoaded', () => {
    const tierListContainer = document.getElementById('tier-list-container');
    const imagePool = document.getElementById('image-pool');
    const imageUpload = document.getElementById('imageUpload');
    const resetButton = document.getElementById('resetButton');
    const deleteZone = document.getElementById('delete-zone');
    
    // Get references to the new delete confirmation modal elements
    const deleteConfirmModal = document.getElementById('deleteConfirmModal');
    const deleteModalCancel = document.getElementById('deleteModalCancel');
    const deleteModalConfirm = document.getElementById('deleteModalConfirm');

    // --- TIER DATA ---
    const tiers = [
        { name: 'S', colorClass: 'tier-s' },
        { name: 'A', colorClass: 'tier-a' },
        { name: 'B', colorClass: 'tier-b' },
        { name: 'C', colorClass: 'tier-c' },
        { name: 'D', colorClass: 'tier-d' },
        { name: 'F', colorClass: 'tier-f' },
    ];

    // --- INITIALIZE TIERS ---
    function createTierRows() {
        tiers.forEach(tier => {
            const row = document.createElement('div');
            row.className = 'tier-row flex items-stretch rounded-lg shadow-md';
            
            const label = document.createElement('div');
            label.className = `tier-label ${tier.colorClass} rounded-l-lg`;
            label.textContent = tier.name;
            
            const container = document.createElement('div');
            container.className = 'image-container';
            container.dataset.tier = tier.name;

            row.appendChild(label);
            row.appendChild(container);
            tierListContainer.appendChild(row);
        });
    }

    // --- STATE MANAGEMENT (SAVE/LOAD FROM SERVER) ---
    async function saveState() {
        const state = {};
        document.querySelectorAll('.image-container, #image-pool').forEach(container => {
            const tierName = container.dataset.tier;
            if (tierName) {
                // Find all wrappers and get the image src from within them
                const wrappers = Array.from(container.querySelectorAll('.tier-item-wrapper'));
                const images = wrappers.map(wrapper => wrapper.querySelector('img').src.split('/').pop());
                state[tierName] = images;
            }
        });

        try {
            const response = await fetch('/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(state),
            });
            if (!response.ok) throw new Error('Failed to save state to server.');
            console.log('State saved successfully.');
        } catch (error) {
            console.error('Error saving state:', error);
            alert('Could not save state to the server. Please check the server console.');
        }
    }

    async function loadState() {
        try {
            const response = await fetch('/state');
            const state = await response.json();
            document.querySelectorAll('.tier-item-wrapper').forEach(item => item.remove());
            for (const tierName in state) {
                const imageFileNames = state[tierName];
                const container = document.querySelector(`[data-tier="${tierName}"]`);
                if (container) {
                    imageFileNames.forEach(fileName => {
                        createTierImage(`/images/${fileName}`, container);
                    });
                }
            }
        } catch (error) {
            console.error('Error loading state:', error);
        }
    }

    // --- IMAGE HANDLING (UPLOADING TO SERVER) ---
    // UPDATED to handle multiple file uploads correctly
    imageUpload.addEventListener('change', async (event) => {
        const files = event.target.files;
        if (files.length === 0) return;

        const formData = new FormData();
        for (const file of files) {
            formData.append('tierImage', file);
        }

        try {
            const response = await fetch('/upload', { method: 'POST', body: formData });
            if (!response.ok) throw new Error('Image upload failed.');
            
            // The server now sends back an object with a filePaths array
            const result = await response.json();

            // Loop through the array of new file paths and create an image for each
            result.filePaths.forEach(filePath => {
                createTierImage(filePath, imagePool);
            });
            
            // Save the state once after all new images have been added
            await saveState();

        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Failed to upload image. Make sure the server is running.');
        }
        event.target.value = null;
    });

    // UPDATED: This function now creates a wrapper with arrows around the image
    function createTierImage(src, parentElement) {
        // 1. Create the main wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'tier-item-wrapper';
        wrapper.draggable = true;
        wrapper.addEventListener('dragstart', handleDragStart);
        wrapper.addEventListener('dragend', handleDragEnd);

        // 2. Create the image
        const img = document.createElement('img');
        img.src = src;
        img.className = 'tier-item';
        
        // 3. Create the arrows
        const leftArrow = document.createElement('button');
        leftArrow.className = 'move-arrow left';
        leftArrow.innerHTML = '&#x2039;'; // Left-pointing single angle quotation mark
        leftArrow.addEventListener('click', (e) => {
            e.stopPropagation(); // prevent drag from starting
            moveItem(wrapper, 'left');
        });
        
        const rightArrow = document.createElement('button');
        rightArrow.className = 'move-arrow right';
        rightArrow.innerHTML = '&#x203A;'; // Right-pointing single angle quotation mark
        rightArrow.addEventListener('click', (e) => {
            e.stopPropagation();
            moveItem(wrapper, 'right');
        });

        // 4. Assemble the component
        wrapper.appendChild(img);
        wrapper.appendChild(leftArrow);
        wrapper.appendChild(rightArrow);
        
        // 5. Add to the DOM
        parentElement.appendChild(wrapper);
    }
    
    // NEW: Function to handle reordering of items
    function moveItem(itemWrapper, direction) {
        const parent = itemWrapper.parentElement;
        if (!parent) return;

        if (direction === 'left') {
            if (itemWrapper.previousElementSibling) {
                parent.insertBefore(itemWrapper, itemWrapper.previousElementSibling);
            }
        } else if (direction === 'right') {
            if (itemWrapper.nextElementSibling) {
                parent.insertBefore(itemWrapper.nextElementSibling, itemWrapper);
            }
        }
        
        // After moving, save the new order
        saveState();
    }
    
    // --- DRAG AND DROP LOGIC ---
    let draggedItem = null;
    let imageToDelete = null;

    function handleDragStart(event) {
        // Now the wrapper is the dragged item
        draggedItem = event.target;
        setTimeout(() => { event.target.style.opacity = '0.5'; }, 0);
    }

    async function handleDragEnd(event) {
        event.target.style.opacity = '1';
        draggedItem = null;
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        await saveState();
    }

    function addDragAndDropListeners(element) {
        element.addEventListener('dragover', handleDragOver);
        element.addEventListener('dragenter', handleDragEnter);
        element.addEventListener('dragleave', handleDragLeave);
        element.addEventListener('drop', handleDrop);
    }

    function handleDragOver(event) {
        event.preventDefault(); 
    }
    
    function handleDragEnter(event) {
        event.preventDefault();
        const container = event.target.closest('.image-container, #image-pool, #delete-zone');
        if (container) {
            container.classList.add('drag-over');
        }
    }

    function handleDragLeave(event) {
         const container = event.target.closest('.image-container, #image-pool, #delete-zone');
         if(container) {
             const relatedTarget = event.relatedTarget;
             if (!relatedTarget || !container.contains(relatedTarget)) {
                container.classList.remove('drag-over');
             }
         }
    }

    function handleDrop(event) {
        event.preventDefault();
        const dropZone = event.target.closest('.image-container, #image-pool');
        if (dropZone && draggedItem) {
            dropZone.appendChild(draggedItem);
        }
    }
    
    // --- DELETE LOGIC ---
    function setupDeleteZone() {
        deleteZone.addEventListener('drop', (e) => {
            e.preventDefault();
            if (!draggedItem) return;

            imageToDelete = draggedItem;
            deleteConfirmModal.classList.remove('hidden');
            deleteConfirmModal.classList.add('flex');
        });
    }
    
    // --- DELETE CONFIRMATION LOGIC ---
    deleteModalCancel.addEventListener('click', () => {
        deleteConfirmModal.classList.add('hidden');
        deleteConfirmModal.classList.remove('flex');
        imageToDelete = null; 
    });

    deleteModalConfirm.addEventListener('click', async () => {
        if (!imageToDelete) return;
        // The image is inside the wrapper (imageToDelete)
        const filename = imageToDelete.querySelector('img').src.split('/').pop();

        try {
            const response = await fetch('/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename }),
            });
            if (!response.ok) throw new Error('Server failed to delete the file.');
            
            imageToDelete.remove(); 
            console.log(`Deleted ${filename}`);
            await saveState(); 
        } catch (error) {
            console.error('Error deleting image:', error);
            alert('Could not delete the image. Please check the server console.');
        } finally {
            deleteConfirmModal.classList.add('hidden');
            deleteConfirmModal.classList.remove('flex');
            imageToDelete = null;
        }
    });

    // --- RESET CONFIRMATION MODAL LOGIC ---
    const confirmModal = document.getElementById('confirmModal');
    const modalCancel = document.getElementById('modalCancel');
    const modalConfirm = document.getElementById('modalConfirm');
    
    resetButton.addEventListener('click', () => {
        confirmModal.classList.remove('hidden');
        confirmModal.classList.add('flex');
    });

    modalCancel.addEventListener('click', () => {
        confirmModal.classList.add('hidden');
        confirmModal.classList.remove('flex');
    });
    
    modalConfirm.addEventListener('click', async () => {
        try {
            const response = await fetch('/reset-all', { method: 'POST' });
            if (!response.ok) throw new Error('Server failed to reset.');
            location.reload();
        } catch (error) {
            console.error('Error resetting application:', error);
            alert('Could not reset the application. Check the server console.');
        }
    });

    confirmModal.addEventListener('click', (e) => {
        if (e.target === confirmModal) {
            modalCancel.click();
        }
    });

    // --- INITIALIZE THE APP ---
    async function initializeApp() {
        createTierRows();
        
        document.querySelectorAll('.image-container, #image-pool').forEach(addDragAndDropListeners);
        
        addDragAndDropListeners(deleteZone);
        setupDeleteZone();
        
        await loadState();
    }

    initializeApp();
});
