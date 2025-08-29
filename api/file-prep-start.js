import { put } from '@vercel/blob';
import sharp from 'sharp';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { fileUrls, jobId } = req.body;

        if (!fileUrls || !Array.isArray(fileUrls) || fileUrls.length === 0) {
            return res.status(400).json({ error: 'Invalid file URLs provided' });
        }

        // Create job metadata
        const job = {
            id: jobId || `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            status: 'processing',
            totalFiles: fileUrls.length,
            processedFiles: 0,
            startTime: new Date().toISOString(),
            files: fileUrls.map((url, index) => ({
                id: `file_${index}`,
                originalUrl: url.url,
                trackingNumber: url.trackingNumber,
                customerName: url.customerName,
                fileId: url.fileId,
                status: 'pending',
                processedUrl: null,
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
            message: `Started processing ${fileUrls.length} files`,
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

                // Download original file
                const originalResponse = await fetch(file.originalUrl);
                if (!originalResponse.ok) {
                    throw new Error(`Failed to download file: ${originalResponse.status}`);
                }

                const originalBuffer = await originalResponse.arrayBuffer();
                const originalBlob = new Uint8Array(originalBuffer);

                // Check if it's an image file
                const contentType = originalResponse.headers.get('content-type') || '';
                
                if (contentType.startsWith('image/')) {
                    // Process image rotation
                    const rotatedBuffer = await rotateImage(originalBlob, contentType);
                    
                    // Upload rotated file to Vercel Blob
                    const fileName = `${file.trackingNumber}_rotated_${file.id}.${getFileExtension(contentType)}`;
                    const rotatedBlob = await put(`jobs/${job.id}/processed/${fileName}`, rotatedBuffer, {
                        access: 'public',
                        contentType: contentType
                    });

                    file.processedUrl = rotatedBlob.url;
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

function getFileExtensionFromUrl(url) {
    const match = url.match(/\.([^.?]+)(?:\?|$)/);
    return match ? match[1] : 'bin';
}
