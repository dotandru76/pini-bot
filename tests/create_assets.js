const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function createTestImages() {
    const dir = path.join(__dirname, '../tests/assets');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // Create a 72 DPI image
    await sharp({
        create: {
            width: 500,
            height: 500,
            channels: 3,
            background: { r: 255, g: 0, b: 0 }
        }
    })
        .withMetadata({ density: 72 })
        .jpeg()
        .toFile(path.join(dir, 'test_72dpi.jpg'));

    // Create a 300 DPI image
    await sharp({
        create: {
            width: 500,
            height: 500,
            channels: 3,
            background: { r: 0, g: 255, b: 0 }
        }
    })
        .withMetadata({ density: 300 })
        .jpeg()
        .toFile(path.join(dir, 'test_300dpi.jpg'));

    console.log("✅ Test images created in tests/assets/");
}

createTestImages();
