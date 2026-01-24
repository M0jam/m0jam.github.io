const fs = require('fs');
const path = require('path');

// Helper to write a BMP file
// We'll create a simple BMP with a solid color/gradient to match PlayHub theme.
// Theme: Dark Slate (#020617) to Slate (#1e293b)

function createBMP(width, height, filename, isHeader = false) {
    const rowSize = Math.floor((24 * width + 31) / 32) * 4;
    const fileSize = 54 + rowSize * height;
    const buffer = Buffer.alloc(fileSize);

    // BMP Header
    buffer.write('BM', 0); // Signature
    buffer.writeUInt32LE(fileSize, 2); // File size
    buffer.writeUInt32LE(0, 6); // Reserved
    buffer.writeUInt32LE(54, 10); // Offset to pixel data

    // DIB Header (BITMAPINFOHEADER)
    buffer.writeUInt32LE(40, 14); // Header size
    buffer.writeInt32LE(width, 18); // Width
    buffer.writeInt32LE(height, 22); // Height (positive = bottom-up)
    buffer.writeUInt16LE(1, 26); // Planes
    buffer.writeUInt16LE(24, 28); // Bits per pixel (RGB)
    buffer.writeUInt32LE(0, 30); // Compression (BI_RGB)
    buffer.writeUInt32LE(0, 34); // Image size (can be 0 for BI_RGB)
    buffer.writeInt32LE(0, 38); // X pixels per meter
    buffer.writeInt32LE(0, 42); // Y pixels per meter
    buffer.writeUInt32LE(0, 46); // Colors used
    buffer.writeUInt32LE(0, 50); // Important colors

    // Pixel Data
    // Color: #020617 (R=2, G=6, B=23) -> BGR: 23, 6, 2
    // Gradient to #1e293b (R=30, G=41, B=59) -> BGR: 59, 41, 30
    
    // Header should be simpler (solid or horizontal gradient)
    // Sidebar should be vertical gradient
    
    const startColor = { r: 2, g: 6, b: 23 }; // #020617
    const endColor = { r: 30, g: 41, b: 59 }; // #1e293b
    const accentColor = { r: 59, g: 130, b: 246 }; // #3b82f6 (Blue)

    let offset = 54;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r, g, b;

            if (isHeader) {
                // Horizontal gradient for header
                const ratio = x / width;
                r = Math.floor(startColor.r + (endColor.r - startColor.r) * ratio);
                g = Math.floor(startColor.g + (endColor.g - startColor.g) * ratio);
                b = Math.floor(startColor.b + (endColor.b - startColor.b) * ratio);
                
                // Add a small accent line at the bottom
                if (y < 4) {
                    r = accentColor.r;
                    g = accentColor.g;
                    b = accentColor.b;
                }
            } else {
                // Vertical gradient for sidebar
                const ratio = y / height;
                r = Math.floor(startColor.r + (endColor.r - startColor.r) * ratio);
                g = Math.floor(startColor.g + (endColor.g - startColor.g) * ratio);
                b = Math.floor(startColor.b + (endColor.b - startColor.b) * ratio);
                
                // Add a small accent line at the right
                if (x > width - 4) {
                    r = accentColor.r;
                    g = accentColor.g;
                    b = accentColor.b;
                }
            }

            // BMP stores BGR
            buffer.writeUInt8(b, offset++);
            buffer.writeUInt8(g, offset++);
            buffer.writeUInt8(r, offset++);
        }
        // Padding
        const padding = rowSize - (width * 3);
        for (let p = 0; p < padding; p++) {
            buffer.writeUInt8(0, offset++);
        }
    }

    fs.writeFileSync(path.join(__dirname, '../build', filename), buffer);
    console.log(`Generated ${filename}`);
}

// Generate assets
try {
    // NSIS recommended sizes
    createBMP(164, 314, 'installerSidebar.bmp', false);
    createBMP(150, 57, 'installerHeader.bmp', true);
    console.log('Installer assets generated successfully.');
} catch (e) {
    console.error('Failed to generate assets:', e);
}
