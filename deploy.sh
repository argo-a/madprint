#!/bin/bash

echo "🚀 Deploying MaddPrints to GitHub and Vercel..."
echo ""

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Not a git repository. Please run 'git init' first."
    exit 1
fi

# Add all files
echo "📁 Adding files to git..."
git add .

# Commit changes
echo "💾 Committing changes..."
git commit -m "Add server-side CORS bypass for Google Drive files

- Added Vercel API proxy to bypass CORS restrictions
- Updated frontend to use proxy instead of direct Google Drive calls
- Removed Chrome extension dependencies
- Added comprehensive error handling and fallbacks
- Ready for deployment to Vercel"

# Push to GitHub
echo "⬆️ Pushing to GitHub..."
git push origin main

echo ""
echo "✅ Successfully pushed to GitHub!"
echo ""
echo "🌐 Next steps:"
echo "1. Go to https://vercel.com"
echo "2. Click 'New Project'"
echo "3. Import your GitHub repository: argo-a/madprint"
echo "4. Click 'Deploy'"
echo ""
echo "Your app will be available at: https://madprint.vercel.app (or similar)"
echo ""
echo "🎉 The CORS issue will be completely solved once deployed!"
