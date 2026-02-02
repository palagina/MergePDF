let selectedFiles = [];
let manualFilenameEdit = false;

document.getElementById('pdfInput').addEventListener('change', function(e) {
    selectedFiles = Array.from(e.target.files);
    // Security: Validate files
    const invalidFiles = selectedFiles.filter(file => {
        // Check file extension
        if (!file.name.toLowerCase().endsWith('.pdf')) {
            return true;
        }
        // Check file size (max 100MB)
        if (file.size > 100 * 1024 * 1024) {
            showStatus(`File too large (max 100MB): ${escapeHtml(file.name)}`, 'error');
            return true;
        }
        return false;
    });
    
    if (invalidFiles.length > 0) {
        showStatus('Some files were rejected. Only PDF files under 100MB are allowed.', 'error');
        selectedFiles = selectedFiles.filter(f => !invalidFiles.includes(f));
    }
    
    updateFileList();
    if (!manualFilenameEdit) {
        updateOutputFilename();
    }
    // Clear any status messages when starting new merge
    document.getElementById('status').style.display = 'none';
});

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function sanitizeFilename(filename) {
    // Security: Remove path components and dangerous characters
    return filename.replace(/[/\\]|\.\.|\.$/g, '').trim() || 'merged.pdf';
}

function generateOutputFilename() {
    if (selectedFiles.length === 0) {
        return 'merged.pdf';
    }
    
    // Get first 10 chars of each filename (without extension)
    const nameParts = selectedFiles.map(file => {
        const filename = file.name.replace('.pdf', '').replace('.PDF', '');
        // Take first 10 characters, replace spaces with underscores
        return filename.replace(/\s+/g, '_').replace(/-/g, '_').substring(0, 10);
    });
    
    return nameParts.join('_') + '.pdf';
}

function updateOutputFilename() {
    document.getElementById('outputName').value = generateOutputFilename();
    manualFilenameEdit = false;
}

function resetFilename() {
    updateOutputFilename();
}

function updateFileList() {
    const fileList = document.getElementById('fileList');
    const outputSection = document.getElementById('outputSection');
    
    if (selectedFiles.length === 0) {
        fileList.innerHTML = 'No files selected';
        fileList.className = 'file-list empty';
        outputSection.style.display = 'none';
        return;
    }
    
    fileList.className = 'file-list';
    outputSection.style.display = 'block';
    fileList.innerHTML = selectedFiles.map((file, index) => {
        // Security: Escape HTML in filenames
        const safeName = escapeHtml(file.name);
        return `
            <div class="file-item">
                <span class="file-name">${index + 1}. ${safeName}</span>
                <button class="remove-btn" onclick="removeFile(${index})">Remove</button>
            </div>
        `;
    }).join('');
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    document.getElementById('pdfInput').value = '';
    updateFileList();
    if (!manualFilenameEdit) {
        updateOutputFilename();
    }
}

function clearFiles() {
    selectedFiles = [];
    document.getElementById('pdfInput').value = '';
    updateFileList();
    manualFilenameEdit = false;
    // Don't clear success messages when clearing files
    const status = document.getElementById('status');
    if (status.className !== 'status success') {
        status.style.display = 'none';
    }
}

async function mergePDFs() {
    if (selectedFiles.length === 0) {
        showStatus('Please select at least one PDF file', 'error');
        return;
    }

    let outputName = document.getElementById('outputName').value || 'merged.pdf';
    // Security: Sanitize output filename
    outputName = sanitizeFilename(outputName);
    
    const mergeBtn = document.getElementById('mergeBtn');
    mergeBtn.disabled = true;

    try {
        showStatus('Processing PDFs...', 'info');
        
        // Create a new PDF document
        const mergedPdf = await PDFLib.PDFDocument.create();
        
        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            showStatus(`Processing file ${i + 1}/${selectedFiles.length}: ${file.name}...`, 'info');
            
            // Read the file as array buffer
            const fileBuffer = await file.arrayBuffer();
            
            // Load the PDF
            const pdf = await PDFLib.PDFDocument.load(fileBuffer);
            
            // Copy all pages from this PDF
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            copiedPages.forEach((page) => {
                mergedPdf.addPage(page);
            });
        }
        
        // Save the merged PDF
        const mergedPdfBytes = await mergedPdf.save();
        
        // Create a blob and download
        const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = outputName.endsWith('.pdf') ? outputName : outputName + '.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showStatus(`Success! PDF merged and downloaded as "${a.download}"`, 'success');
        
        // Clear files list after successful merge (but keep success message visible)
        setTimeout(() => {
            clearFiles();
        }, 3000);
        
    } catch (error) {
        console.error('Merge error:', error);
        showStatus(`Error: ${error.message}`, 'error');
    } finally {
        mergeBtn.disabled = false;
    }
}

function showStatus(message, type) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = `status ${type}`;
    status.style.display = 'block';
}
