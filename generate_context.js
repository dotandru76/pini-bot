const fs = require('fs');
const path = require('path');

const outputFile = 'PROJECT_CONTEXT.md';
const ignoreList = ['node_modules', '.git', '.env', 'package-lock.json', 'image_assets', 'generate_context.js', 'PROJECT_CONTEXT.md'];
const allowedExtensions = ['.js', '.json', '.html', '.css', '.md'];

function scanDirectory(dir, fileList = []) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        if (ignoreList.includes(file)) return;
        
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            scanDirectory(filePath, fileList);
        } else {
            if (allowedExtensions.includes(path.extname(file))) {
                fileList.push(filePath);
            }
        }
    });

    return fileList;
}

const allFiles = scanDirectory(__dirname);
let content = `# PINI BOT PROJECT CONTEXT\nGenerated: ${new Date().toISOString()}\n\n`;

allFiles.forEach(file => {
    const relativePath = path.relative(__dirname, file);
    const fileContent = fs.readFileSync(file, 'utf8');
    content += `\n\n--- FILE: ${relativePath} ---\n\`\`\`${path.extname(file).substring(1)}\n${fileContent}\n\`\`\`\n`;
});

fs.writeFileSync(outputFile, content);
console.log(`✅ Context generated at: ${outputFile}`);