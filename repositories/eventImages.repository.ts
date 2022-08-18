import * as path from "path";
import { Storage } from '@google-cloud/storage';
import { GetFilesResponse } from "@google-cloud/storage/build/src/bucket";
const serviceKey = path.join(__dirname + '/../routes/', 'google_cloud_sa_uploader_keys.json');

interface ImageFile {
    filePath: string,
    fileName: string,
    type: any
};

export class EventImagesRepository {

    private storage;
    private bucket;
    private bucketName = 'fg1-event-assets';

    constructor() {

        this.storage = new Storage({
            keyFilename: serviceKey,
            projectId: 'green-network-233421',
        });

        this.bucket = this.storage.bucket(this.bucketName);

    }

    public async download({filename, options}): Promise<void> {
        return this.bucket.file(filename).download(options);
    }

    public async getMany(options?: Partial<{ autoPaginate: boolean, prefix: string }> | undefined): Promise<GetFilesResponse> {

        const _options = {
            ...(options && options),
        };

        return this.bucket.getFiles(_options);
    }

    public async create(
        {
            filePath,
            fileName,
            type
        }: ImageFile): Promise<string> {

        try {

            await this.bucket.upload(filePath, {
                destination: fileName,
                metadata: {
                    contentType: type
                },
                resumable: false
            });

            return fileName;

        } catch (e) {

            console.log('Uploading error');
            throw e;

        }

    }
}
