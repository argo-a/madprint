#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Get current date for version increment
const now = new Date();
const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, '0');
const day = String(now.getDate()).padStart(2, '0');

// Read package.json to get current version
let packageJson;
try {
    packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
} catch (error) {
    console.error('Error reading package.json:', error);
    process.exit(1);
}

// Parse current version
const currentVersion = packageJson.version || '2.8.0';
const versionParts = currentVersion.split('.');
let major = parseInt(versionParts[0]) || 2;
let minor = parseInt(versionParts[1]) || 8;
let patch = parseInt(versionParts[2]) || 0;

// Increment patch version
patch++;

const newVersion = `${major}.${minor}.${patch}`;

console.log(`🔄 Updating version from ${currentVersion} to ${newVersion}`);

// Update package.json
packageJson.version = newVersion;
fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2) + '\n');
console.log('✅ Updated package.json');

// Files to update with version numbers
const filesToUpdate = [
    'index.html',
    'MaddInvoice/index.html',
    'Duplicator/index.html',
    'FilePrep/index.html'
];

// Update version in HTML files
filesToUpdate.forEach(filePath => {
    if (fs.existsSync(filePath)) {
        try {
            let content = fs.readFileSync(filePath, 'utf8');
            
            // Replace version patterns
            const versionPatterns = [
                /MaddPrints v\d+\.\d+(\.\d+)?/g,
                /MaddInvoice v\d+\.\d+(\.\d+)?/g,
                /Duplicator v\d+\.\d+(\.\d+)?/g,
                /FILE PREP v\d+\.\d+(\.\d+)?/g
            ];
            
            const replacements = [
                `MaddPrints v${newVersion}`,
                `MaddInvoice v${newVersion}`,
                `Duplicator v${newVersion}`,
                `FILE PREP v${newVersion}`
            ];
            
            // Apply replacements
            versionPatterns.forEach((pattern, index) => {
                if (content.match(pattern)) {
                    content = content.replace(pattern, replacements[index]);
                }
            });
            
            fs.writeFileSync(filePath, content);
            console.log(`✅ Updated ${filePath}`);
        } catch (error) {
            console.error(`❌ Error updating ${filePath}:`, error.message);
        }
    } else {
        console.log(`⚠️  File not found: ${filePath}`);
    }
});

// Update TECHNICAL-DOCS.md
if (fs.existsSync('TECHNICAL-DOCS.md')) {
    try {
        let content = fs.readFileSync('TECHNICAL-DOCS.md', 'utf8');
        content = content.replace(/## Version: \d+\.\d+(\.\d+)?/, `## Version: ${newVersion}`);
        content = content.replace(/### v\d+\.\d+(\.\d+)? \(Current\)/, `### v${newVersion} (Current)`);
        fs.writeFileSync('TECHNICAL-DOCS.md', content);
        console.log('✅ Updated TECHNICAL-DOCS.md');
    } catch (error) {
        console.error('❌ Error updating TECHNICAL-DOCS.md:', error.message);
    }
}

console.log(`🎉 Version update complete! New version: ${newVersion}`);
console.log('📝 Changes made:');
console.log('   - package.json version updated');
console.log('   - All HTML files version strings updated');
console.log('   - Technical documentation updated');
console.log('');
console.log('💡 Ready for git commit and push!');
