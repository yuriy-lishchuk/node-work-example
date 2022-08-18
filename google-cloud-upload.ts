import * as path from 'path';

const gcStorage = require('@google-cloud/storage');

//multer
const multer = require('multer');
const multerStorage = multer.memoryStorage();
export const upload = require('multer')({ storage: multerStorage });

// Google Cloud Storage
const serviceKey = path.join(__dirname, './routes/keys.json');
const { Storage } = gcStorage;
const gCloudStorage = new Storage({
    keyFilename: serviceKey,
    projectId: 'green-network-233421',
});

export function getStorageBucket(backetName: string) {
    return gCloudStorage.bucket(backetName);
}

export async function gcStorageUpload(
    backetName: string,
    buffer: Buffer,
    fileName: string,
    mimeType: string
): Promise<any> {
    const bucketFile = getStorageBucket(backetName).file(fileName);

    const stream = bucketFile.createWriteStream({
        metadata: {
            contentType: mimeType,
        },
        resumable: false,
    });

    return new Promise<any>((resolve, reject) => {
        stream.on('error', (err: Error) => {
            reject(err);
        });

        stream.on('finish', async () => {
            resolve(fileName);
        });

        stream.end(buffer);
    });
}
