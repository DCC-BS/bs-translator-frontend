/**
 * Longest side a photo is sent to OCR with. GLM-OCR renders crops at its own scale,
 * so more pixels than this only make the upload and the OCR slower.
 */
export const OCR_MAX_IMAGE_SIDE = 2560;

const OCR_JPEG_QUALITY = 0.9;

function canvasToBlob(
    canvas: HTMLCanvasElement,
    type: string,
    quality?: number,
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) =>
                blob
                    ? resolve(blob)
                    : reject(new Error("Could not encode the image")),
            type,
            quality,
        );
    });
}

/**
 * Normalizes a photo for OCR: applies the EXIF orientation (gallery photos from
 * phones are often stored rotated), scales it down to {@link OCR_MAX_IMAGE_SIDE}
 * and re-encodes it as JPEG. The result is what the overlay draws as well, so
 * the OCR boxes and the displayed image always match.
 *
 * @throws Error when the file is not a decodable image
 */
export async function prepareImageForOcr(image: Blob): Promise<Blob> {
    const bitmap = await createImageBitmap(image, {
        imageOrientation: "from-image",
    });
    try {
        const scale = Math.min(
            1,
            OCR_MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height),
        );
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));

        const context = canvas.getContext("2d");
        if (!context) {
            throw new Error("Canvas 2D context is not available");
        }
        context.imageSmoothingQuality = "high";
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

        return await canvasToBlob(canvas, "image/jpeg", OCR_JPEG_QUALITY);
    } finally {
        bitmap.close();
    }
}

/**
 * Grabs the current frame of a playing video as a JPEG.
 *
 * @throws Error when the video has no frame yet
 */
export async function captureVideoFrame(
    video: HTMLVideoElement,
): Promise<Blob> {
    if (!video.videoWidth || !video.videoHeight) {
        throw new Error("The camera has not delivered a frame yet");
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
        throw new Error("Canvas 2D context is not available");
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return await canvasToBlob(canvas, "image/jpeg", OCR_JPEG_QUALITY);
}
