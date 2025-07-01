# MaddPrints - Tracking Number Image Matcher

A web application that matches tracking numbers to product images from CSV files, with server-side CORS bypass for Google Drive files.

## 🚀 Features

- **CSV Upload & Processing**: Upload order CSV files with tracking numbers and Google Drive image URLs
- **Smart Search**: Search by tracking number to find associated product images
- **Google Drive Integration**: Display images and PDFs directly from Google Drive URLs
- **Server-Side CORS Bypass**: No browser restrictions - works reliably for all users
- **Multiple File Formats**: Supports both images and PDF files
- **Responsive Design**: Works on desktop and mobile devices

## 📁 Project Structure

```
madprint/
├── index.html          # Main web application
├── api/
│   └── proxy.js        # Vercel serverless function for CORS bypass
├── vercel.json         # Vercel deployment configuration
└── README.md           # This file
```

## 🛠️ Deployment to Vercel

### Prerequisites
- GitHub account
- Vercel account (free)
- Your CSV files with Google Drive URLs in the "notes" field

### Step 1: Push to GitHub
1. Make sure all files are in your GitHub repository: `https://github.com/argo-a/madprint.git`
2. Commit and push all changes:
   ```bash
   git add .
   git commit -m "Add server-side CORS bypass"
   git push origin main
   ```

### Step 2: Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import your GitHub repository: `argo-a/madprint`
4. Vercel will automatically detect the configuration
5. Click "Deploy"

### Step 3: Access Your App
- Your app will be available at: `https://madprint.vercel.app` (or similar)
- The deployment typically takes 1-2 minutes

## 🔧 How It Works

### CORS Bypass Solution
The app uses a server-side proxy to bypass Google Drive's CORS restrictions:

1. **Frontend**: Requests Google Drive files through `/api/proxy?url=...`
2. **Proxy Server**: Fetches files server-side (no CORS issues)
3. **Response**: Returns file data to the frontend

### Supported Google Drive URLs
The app automatically extracts and processes these URL formats:
- `https://drive.google.com/file/d/FILE_ID/view?usp=drive_link`
- Converts to various endpoints for optimal loading

### CSV Format
Your CSV should include:
- `tracking_number` column
- `notes` column containing Google Drive URLs
- Other order details (optional)

## 📊 Usage

1. **Upload CSV**: Click "Choose CSV File" and select your orders file
2. **Search**: Enter a tracking number and press Enter
3. **View Results**: Images and PDFs will load automatically via the proxy
4. **Download**: Use the download buttons for offline access

## 🔍 Troubleshooting

### Images Not Loading
- Ensure Google Drive files are publicly accessible
- Check that URLs are in the correct format
- Verify the "notes" field contains valid Google Drive links

### Deployment Issues
- Make sure all files are committed to GitHub
- Check Vercel deployment logs for errors
- Ensure `api/proxy.js` and `vercel.json` are present

### CSV Problems
- Verify column names match expected format
- Check for extra spaces in headers
- Ensure tracking numbers are unique

## 🎯 Benefits Over Local Version

- ✅ **No Browser Restrictions**: Works on any device/browser
- ✅ **No Extension Required**: No Chrome extension installation needed
- ✅ **Better Performance**: Server-side processing is faster
- ✅ **Mobile Friendly**: Works on phones and tablets
- ✅ **Always Available**: Accessible from anywhere with internet
- ✅ **Reliable**: No CORS errors or loading failures

## 🔒 Security

- Only Google Drive URLs are allowed through the proxy
- No sensitive data is stored on the server
- All processing happens client-side except for file fetching
- Files are streamed directly to the browser

## 📝 License

This project is for internal use. All rights reserved.

---

**Need help?** Check the Vercel deployment logs or contact support.
