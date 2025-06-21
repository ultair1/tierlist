document.addEventListener('DOMContentLoaded', () => {
    const tierListContainer = document.getElementById('tier-list-container');
    const imagePool = document.getElementById('image-pool');
    const imageUpload = document.getElementById('imageUpload');
    const resetButton = document.getElementById('resetButton');
    const deleteZone = document.getElementById('delete-zone');
    const interactionModeToggle = document.getElementById('interaction-mode-toggle');
    
    // Modal references
    const confirmModal = document.getElementById('confirmModal');
    const modalCancel = document.getElementById('modalCancel');
    const modalConfirm = document.getElementById('modalConfirm');
    const deleteConfirmModal = document.getElementById('deleteConfirmModal');
    const deleteModalCancel = document.getElementById('deleteModalCancel');
    const deleteModalConfirm = document.getElementById('deleteModalConfirm');

    // --- STATE VARIABLES ---
    let draggedItem = null;
    let imageToDelete = null;
    let selectedItem = null;
    let currentInteractionMode = 'both'; // 'drag', 'click', or 'both'

    // --- TIER DATA ---
    const tiers = [
        { name: 'S', colorClass: 'tier-s' },
        { name: 'A', colorClass: 'tier-a' },
        { name: 'B', colorClass: 'tier-b' },
        { name: 'C', colorClass: 'tier-c' },
        { name: 'D', colorClass: 'tier-d' },
        { name: 'F', colorClass: 'tier-f' },
    ];

    // --- INITIALIZATION ---
    function initializeApp() {
        createTierRows();
        setupEventListeners();
        updateInteractionMode(currentInteractionMode);
        loadState();
    }

    function setupEventListeners() {
        // Main containers
        document.querySelectorAll('.image-container, #image-pool').forEach(addDragAndDropListeners);
        addDragAndDropListeners(deleteZone);
        setupDeleteZone();

        // Interaction Mode Toggle Buttons
        interactionModeToggle.addEventListener('click', (e) => {
            if (e.target.matches('.mode-btn')) {
                const mode = e.target.dataset.mode;
                updateInteractionMode(mode);
            }
        });
        
        // Modals
        resetButton.addEventListener('click', () => showModal(confirmModal));
        modalCancel.addEventListener('click', () => hideModal(confirmModal));
        modalConfirm.addEventListener('click', handleResetConfirm);
        confirmModal.addEventListener('click', (e) => { if (e.target === confirmModal) hideModal(confirmModal); });

        deleteModalCancel.addEventListener('click', () => hideModal(deleteConfirmModal, () => { imageToDelete = null; }));
        deleteModalConfirm.addEventListener('click', handleDeleteConfirm);
        
        // NEW: Add keyboard listener for selected item movement
        document.addEventListener('keydown', handleKeyPress);
    }

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

    // --- STATE MANAGEMENT ---
    async function saveState() {
        const state = {};
        document.querySelectorAll('.image-container, #image-pool').forEach(container => {
            const tierName = container.dataset.tier;
            if (tierName) {
                const wrappers = Array.from(container.querySelectorAll('.tier-item-wrapper'));
                const images = wrappers.map(wrapper => wrapper.querySelector('img').src.split('/').pop());
                state[tierName] = images;
            }
        });
        try {
            await fetch('/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(state),
            });
            console.log('State saved successfully.');
        } catch (error) {
            console.error('Error saving state:', error);
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
                    imageFileNames.forEach(fileName => createTierImage(`/images/${fileName}`, container));
                }
            }
            // After loading, ensure all items have correct mode properties
            updateDraggableStatus();
        } catch (error) {
            console.error('Error loading state:', error);
        }
    }

    // --- IMAGE HANDLING ---
    imageUpload.addEventListener('change', async (event) => {
        const files = event.target.files;
        if (files.length === 0) return;
        const formData = new FormData();
        for (const file of files) formData.append('tierImage', file);
        try {
            const response = await fetch('/upload', { method: 'POST', body: formData });
            if (!response.ok) throw new Error('Upload failed');
            const result = await response.json();
            result.filePaths.forEach(filePath => createTierImage(filePath, imagePool));
            await saveState();
        } catch (error) {
            console.error('Error uploading image:', error);
        }
        event.target.value = null;
    });

    function createTierImage(src, parentElement) {
        const wrapper = document.createElement('div');
        wrapper.className = 'tier-item-wrapper';
        wrapper.addEventListener('dragstart', handleDragStart);
        wrapper.addEventListener('dragend', handleDragEnd);
        wrapper.addEventListener('click', handleItemClick);

        const img = document.createElement('img');
        img.src = src;
        img.className = 'tier-item';
        
        // Horizontal Arrows
        const leftArrow = createArrow('&#x2039;', 'left horizontal', () => moveItemHorizontal(wrapper, 'left'));
        const rightArrow = createArrow('&#x203A;', 'right horizontal', () => moveItemHorizontal(wrapper, 'right'));
        // Vertical Arrows
        const upArrow = createArrow('&#x25B2;', 'up vertical', () => moveItemVertical(wrapper, 'up'));
        const downArrow = createArrow('&#x25BC;', 'down vertical', () => moveItemVertical(wrapper, 'down'));
        
        wrapper.append(img, leftArrow, rightArrow, upArrow, downArrow);
        parentElement.appendChild(wrapper);
        // Set draggable based on current mode
        wrapper.draggable = (currentInteractionMode !== 'click');
    }

    function createArrow(text, classNames, clickHandler) {
        const arrow = document.createElement('button');
        arrow.className = 'move-arrow ' + classNames;
        arrow.innerHTML = text;
        arrow.addEventListener('click', (e) => {
            e.stopPropagation();
            clickHandler();
        });
        return arrow;
    }
    
    // --- INTERACTION MODE LOGIC ---
    function updateInteractionMode(mode) {
        currentInteractionMode = mode;
        document.body.className = `p-4 md:p-8 mode-${mode}`;

        interactionModeToggle.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        
        updateDraggableStatus();
        
        if (selectedItem) {
            deselectItem();
        }
    }

    function updateDraggableStatus() {
        const isDraggable = (currentInteractionMode !== 'click');
        document.querySelectorAll('.tier-item-wrapper').forEach(item => {
            item.draggable = isDraggable;
        });
    }

    function handleItemClick(event) {
        if (currentInteractionMode === 'drag') return; // Do nothing in drag-only mode
        
        const clickedWrapper = event.currentTarget;
        
        if (selectedItem === clickedWrapper) {
            deselectItem();
        } else {
            if (selectedItem) {
                deselectItem();
            }
            selectItem(clickedWrapper);
        }
    }

    function selectItem(wrapper) {
        selectedItem = wrapper;
        wrapper.classList.add('selected');
    }

    function deselectItem() {
        if (!selectedItem) return;
        selectedItem.classList.remove('selected');
        selectedItem = null;
    }

    // NEW: Handles keyboard controls for the selected item
    function handleKeyPress(event) {
        if (!selectedItem || currentInteractionMode === 'drag') {
            return;
        }

        switch (event.key) {
            case 'ArrowUp':
                event.preventDefault(); // Prevent page scrolling
                moveItemVertical(selectedItem, 'up');
                break;
            case 'ArrowDown':
                event.preventDefault();
                moveItemVertical(selectedItem, 'down');
                break;
            case 'ArrowLeft':
                event.preventDefault();
                moveItemHorizontal(selectedItem, 'left');
                break;
            case 'ArrowRight':
                event.preventDefault();
                moveItemHorizontal(selectedItem, 'right');
                break;
            case 'Escape':
                event.preventDefault(); // Prevent any other default browser action
                deselectItem();
                break;
        }
    }
    
    // --- REORDERING LOGIC ---
    function moveItemHorizontal(itemWrapper, direction) {
        const parent = itemWrapper.parentElement;
        if (!parent) return;
        if (direction === 'left' && itemWrapper.previousElementSibling) {
            parent.insertBefore(itemWrapper, itemWrapper.previousElementSibling);
        } else if (direction === 'right' && itemWrapper.nextElementSibling) {
            parent.insertBefore(itemWrapper.nextElementSibling, itemWrapper);
        }
        saveState();
    }
    
    function moveItemVertical(itemWrapper, direction) {
        const container = itemWrapper.parentElement;
        if (!container) return;

        const containerStyle = window.getComputedStyle(container);
        const itemStyle = window.getComputedStyle(itemWrapper);
        const gap = parseFloat(containerStyle.gap) || 8;
        const containerWidth = container.clientWidth - parseFloat(containerStyle.paddingLeft) - parseFloat(containerStyle.paddingRight);
        const itemWidth = itemWrapper.offsetWidth + gap;
        const itemsPerRow = Math.max(1, Math.floor(containerWidth / itemWidth));
        
        const items = Array.from(container.children);
        const currentIndex = items.indexOf(itemWrapper);
        
        if (direction === 'up') {
            const targetIndex = currentIndex - itemsPerRow;
            if (targetIndex >= 0) {
                container.insertBefore(itemWrapper, items[targetIndex]);
            }
        } else if (direction === 'down') {
            const targetIndex = currentIndex + itemsPerRow;
            if (targetIndex < items.length) {
                container.insertBefore(itemWrapper, items[targetIndex + 1] || null);
            } else {
                container.appendChild(itemWrapper);
            }
        }
        saveState();
    }
    
    // --- DRAG AND DROP & DELETE LOGIC ---
    function handleDragStart(event) {
        if (currentInteractionMode === 'click') {
            event.preventDefault();
            return;
        }
        draggedItem = event.target;
        setTimeout(() => { event.target.style.opacity = '0.5'; }, 0);
    }

    async function handleDragEnd() {
        if (draggedItem) draggedItem.style.opacity = '1';
        draggedItem = null;
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        await saveState();
    }
    
    function addDragAndDropListeners(element) {
        element.addEventListener('dragover', (e) => e.preventDefault());
        element.addEventListener('dragenter', (e) => {
            e.preventDefault();
            const container = e.target.closest('.image-container, #image-pool, #delete-zone');
            if (container) container.classList.add('drag-over');
        });
        element.addEventListener('dragleave', (e) => {
            const container = e.target.closest('.image-container, #image-pool, #delete-zone');
            if (container && (!e.relatedTarget || !container.contains(e.relatedTarget))) {
                container.classList.remove('drag-over');
            }
        });
        element.addEventListener('drop', (e) => {
             e.preventDefault();
             const dropZone = e.target.closest('.image-container, #image-pool');
             if (dropZone && draggedItem) dropZone.appendChild(draggedItem);
        });
    }

    function setupDeleteZone() {
        deleteZone.addEventListener('drop', (e) => {
            e.preventDefault();
            if (!draggedItem) return;
            imageToDelete = draggedItem;
            showModal(deleteConfirmModal);
        });
    }
    
    async function handleDeleteConfirm() {
        if (!imageToDelete) return;
        const filename = imageToDelete.querySelector('img').src.split('/').pop();
        try {
            await fetch('/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename }),
            });
            imageToDelete.remove();
            await saveState(); 
        } catch (error) {
            console.error('Error deleting image:', error);
        } finally {
            hideModal(deleteConfirmModal, () => { imageToDelete = null; });
        }
    }
    
    async function handleResetConfirm() {
        try {
            await fetch('/reset-all', { method: 'POST' });
            location.reload();
        } catch (error) {
            console.error('Error resetting application:', error);
        }
    }

    // --- UTILITY (MODALS) ---
    function showModal(modalElement) {
        modalElement.classList.remove('hidden');
        modalElement.classList.add('flex');
    }

    function hideModal(modalElement, callback) {
        modalElement.classList.add('hidden');
        modalElement.classList.remove('flex');
        if (callback) callback();
    }

    // --- RUN APP ---
    initializeApp();
});
