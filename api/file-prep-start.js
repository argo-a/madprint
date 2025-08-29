import { put } from '@vercel/blob';
import sharp from 'sharp';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { files, fileUrls, jobId } = req.body;
        
        // Support both 'files' and 'fileUrls' for backward compatibility
        const fileData = files || fileUrls;

        if (!fileData || !Array.isArray(fileData) || fileData.length === 0) {
            return res.status(400).json({ error: 'Invalid file data provided' });
        }

        // Create job metadata
        const job = {
            id: jobId || `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            status: 'processing',
            totalFiles: fileData.length,
            processedFiles: 0,
            startTime: new Date().toISOString(),
            files: fileData.map((item, index) => ({
                id: `file_${index}`,
                originalUrl: item.url,
                trackingNumber: item.trackingNumber,
                customerName: item.customerName,
                orderNumber: item.orderNumber,
                fileId: item.fileId,
                originalFilename: item.originalFilename,
                status: 'pending',
                processedUrl: null,
                thumbnailUrl: null,
                error: null
            }))
        };

        // Store job metadata in Vercel Blob
        const jobBlob = await put(`jobs/${job.id}/metadata.json`, JSON.stringify(job), {
            access: 'public',
            contentType: 'application/json'
        });

        // Start processing files asynchronously
        processFilesAsync(job);

        res.status(200).json({
            success: true,
            jobId: job.id,
            message: `Started processing ${fileData.length} files`,
            statusUrl: `/api/file-prep-status?jobId=${job.id}`
        });

    } catch (error) {
        console.error('Error starting file prep job:', error);
        res.status(500).json({ error: 'Failed to start file preparation job' });
    }
}

async function processFilesAsync(job) {
    try {
        for (let i = 0; i < job.files.length; i++) {
            const file = job.files[i];
            
            try {
                // Update file status to processing
                file.status = 'processing';
                await updateJobMetadata(job);

                // Convert Google Drive URL to direct download URL
                const downloadUrl = convertGoogleDriveUrl(file.originalUrl);
                console.log(`Downloading from: ${downloadUrl}`);
                
                // Download original file
                const originalResponse = await fetch(downloadUrl);
                if (!originalResponse.ok) {
                    throw new Error(`Failed to download file: ${originalResponse.status} from ${downloadUrl}`);
                }

                const originalBuffer = await originalResponse.arrayBuffer();
                const originalBlob = new Uint8Array(originalBuffer);

                // Check if it's an image file
                const contentType = originalResponse.headers.get('content-type') || '';
                
                if (contentType.startsWith('image/')) {
                    // Process image rotation and thumbnail generation
                    const rotatedBuffer = await rotateImage(originalBlob, contentType);
                    const thumbnailBuffer = await generateThumbnail(originalBlob, contentType);
                    
                    // Upload rotated file to Vercel Blob
                    const fileName = `${file.trackingNumber}_rotated_${file.id}.${getFileExtension(contentType)}`;
                    const rotatedBlob = await put(`jobs/${job.id}/processed/${fileName}`, rotatedBuffer, {
                        access: 'public',
                        contentType: contentType
                    });

                    // Upload thumbnail to Vercel Blob
                    const thumbnailFileName = `thumbnails/${file.trackingNumber}_${file.orderNumber}_thumb.jpg`;
                    const thumbnailBlob = await put(thumbnailFileName, thumbnailBuffer, {
                        access: 'public',
                        contentType: 'image/jpeg'
                    });

                    file.processedUrl = rotatedBlob.url;
                    file.thumbnailUrl = thumbnailBlob.url;
                    file.status = 'completed';
                } else {
                    // For non-image files, just copy them
                    const fileName = `${file.trackingNumber}_${file.id}.${getFileExtensionFromUrl(file.originalUrl)}`;
                    const copiedBlob = await put(`jobs/${job.id}/processed/${fileName}`, originalBlob, {
                        access: 'public',
                        contentType: contentType || 'application/octet-stream'
                    });

                    file.processedUrl = copiedBlob.url;
                    file.status = 'skipped'; // Indicate it was copied, not rotated
                }

                job.processedFiles++;

            } catch (fileError) {
                console.error(`Error processing file ${file.id}:`, fileError);
                file.status = 'error';
                file.error = fileError.message;
                job.processedFiles++;
            }

            // Update job metadata after each file
            await updateJobMetadata(job);
        }

        // Mark job as completed
        job.status = 'completed';
        job.endTime = new Date().toISOString();
        await updateJobMetadata(job);

    } catch (error) {
        console.error('Error in async file processing:', error);
        job.status = 'error';
        job.error = error.message;
        job.endTime = new Date().toISOString();
        await updateJobMetadata(job);
    }
}

async function updateJobMetadata(job) {
    try {
        await put(`jobs/${job.id}/metadata.json`, JSON.stringify(job), {
            access: 'public',
            contentType: 'application/json'
        });
    } catch (error) {
        console.error('Error updating job metadata:', error);
    }
}

async function rotateImage(imageBuffer, contentType) {
    try {
        // Use Sharp to rotate image 90 degrees clockwise
        const rotatedBuffer = await sharp(Buffer.from(imageBuffer))
            .rotate(90) // 90 degrees clockwise
            .toBuffer();
        
        return rotatedBuffer;
    } catch (error) {
        console.error('Error rotating image with Sharp:', error);
        // If Sharp fails, return original buffer
        return imageBuffer;
    }
}

async function generateThumbnail(imageBuffer, contentType) {
    try {
        // Generate a 200x200 thumbnail using Sharp
        const thumbnailBuffer = await sharp(Buffer.from(imageBuffer))
            .resize(200, 200, {
                fit: 'cover',
                position: 'center'
            })
            .jpeg({ quality: 85 }) // Convert to JPEG for consistency
            .toBuffer();
        
        return thumbnailBuffer;
    } catch (error) {
        console.error('Error generating thumbnail with Sharp:', error);
        // If thumbnail generation fails, create a simple placeholder
        try {
            const placeholderBuffer = await sharp({
                create: {
                    width: 200,
                    height: 200,
                    channels: 3,
                    background: { r: 240, g: 240, b: 240 }
                }
            })
            .jpeg()
            .toBuffer();
            
            return placeholderBuffer;
        } catch (placeholderError) {
            console.error('Error creating placeholder thumbnail:', placeholderError);
            return imageBuffer; // Return original as fallback
        }
    }
}

function getFileExtension(contentType) {
    const extensions = {
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp',
        'application/pdf': 'pdf'
    };
    return extensions[contentType] || 'bin';
}

function convertGoogleDriveUrl(url) {
    // Check if it's a Google Drive URL that needs conversion
    if (url.includes('drive.google.com') && url.includes('/file/d/')) {
        // Extract file ID from URLs like:
        // https://drive.google.com/file/d/FILE_ID/view?usp=drive_link
        // https://drive.google.com/file/d/FILE_ID/view?usp=sharing
        const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (fileIdMatch) {
            const fileId = fileIdMatch[1];
            // Convert to direct download URL
            return `https://drive.google.com/uc?export=download&id=${fileId}`;
        }
    }
    
    // If it's not a Google Drive URL or already in direct format, return as-is
    return url;
}

function getFileExtensionFromUrl(url) {
    const match = url.match(/\.([^.?]+)(?:\?|$)/);
    return match ? match[1] : 'bin';
}
