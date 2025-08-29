#!/bin/bash

# Pre-commit hook to automatically update versions
echo "🔄 Running pre-commit version update..."

# Run the version update script
node update-version.js

# Add the updated files to the commit
git add package.json
git add index.html
git add MaddInvoice/index.html
git add Duplicator/index.html
git add FilePrep/index.html
git add TECHNICAL-DOCS.md

echo "✅ Version update complete and files staged"
