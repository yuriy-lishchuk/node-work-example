import { EventImagesRepository } from "../repositories/eventImages.repository";
import { compress } from "compress-images/promise";
import * as fs from "fs";
import * as path from "path";
import * as imageThumbnail from 'image-thumbnail';

export interface UploadWithCompressingResponse {
    coverImgName: string,
    thumbnailImgName: string
}

interface ThumbnailOptions {
    width: number,
    height: number,
    fit: string
}

const appRootDir = 'dist';

export class EventImagesService {
    private repo: EventImagesRepository;

    constructor(repository: EventImagesRepository) {
        this.repo = repository;
    }

    public cleanTempFolder(pathToFile: string | string[]) {
        try {

            // if input would be undefined
            if (!pathToFile) {
                throw 'Empty filePath';
            }

            // filter for empty an string
            [].concat(pathToFile).filter(f => !!f && f.length > 0 ).forEach(fs.unlinkSync);

        } catch (e) {

            console.log('Cant delete file', e);

        }
    }

    public async download({ srcFilename }): Promise<string> {
        try {

            const destination = appRootDir + '/temp/original_' + srcFilename;
            const options = {
                destination,
            };

            // Downloads the file
            await this.repo.download({ filename: srcFilename, options });

            return destination;

        } catch (e) {

            console.log('EventImagesService:: download error', e);

        }
    }

    public async createThumbnail(pathToFile: string, options?: Partial<ThumbnailOptions>, output?: string): Promise<string> {
        const fileName = path.basename(pathToFile);
        const _output = output || path.dirname(pathToFile) + '/thumb_' + fileName;

        const defaultOptions = {
            fit: 'cover',
            width: 345,
            height: 153
        };

        const _options = {
            ...defaultOptions,
            ...(options && options)
        };

        try {

            const imageBuffer = await imageThumbnail(pathToFile, _options);

            fs.writeFileSync(_output, imageBuffer);

            return _output;

        } catch (e) {

            console.log('error crating thumbnail');

        }
    }

    public async compress({ filePath }): Promise<string> {
        const fileName = path.basename(filePath);
        const output = appRootDir + '/temp/compressed_';

        const result = await compress({
            source: filePath,
            destination: output,
            enginesSetup: {
                jpg: {engine: "mozjpeg", command: ['-quality', '60']},
                png: {engine: 'pngquant', command: ["--quality=20-50", "-o"]},
                svg: {engine: false, command: false},
                gif: {
                    engine: false, command: false
                }
            }
        });

        const { errors, statistics } = result;

        if (result.errors.length > 0) {
            throw errors;
        }

        const compressedFilePath = statistics[0].path_out_new;

        return compressedFilePath;
    }

    public async removeOldEventSplashImgs({ fileToKeep, eventCode }) {
        try {
            const [files] = await this.repo.getMany({
                autoPaginate: false,
                prefix: `${eventCode}_eventSplashImage`,
            });

            files.forEach(file => {
                try {
                    if (file.name !== fileToKeep) {
                        file.delete();
                    }
                } catch (e) {
                    console.warn(`Unable to remove file ${file.name}`);
                    console.warn(e);
                }
            })
        } catch (e) {
            console.warn(`Unable to remove old event slash imgs for ${eventCode}`);
            console.warn(e);
        }
    }

    public thumbnailName(coverImageFileName: string): string {
        const splited = coverImageFileName.split('.');

        if (splited.length > 2) {
            throw 'Invalid file name';
        }

        const name = splited[0];
        const ext = splited[1];

        return name + '_thumb.' + ext.toString();
    }

    public async uploadEventCoverImage({ fileName, type, filePath: path }): Promise<UploadWithCompressingResponse> {
        let pathToCompressedFile, thumbnail;

        try {
            // compress
            pathToCompressedFile = await this.compress({ filePath: path });

            // upload
            const [uploadedFileName, _thumbnail] = await Promise.all([
                this.repo.create({
                    fileName,
                    type,
                    filePath: pathToCompressedFile
                }),
                this.createThumbnail(pathToCompressedFile)
            ]);
            thumbnail = _thumbnail;

            const thumbName = this.thumbnailName(fileName);

            await this.repo.create({
                fileName: thumbName,
                type,
                filePath: thumbnail
            });

            return {
                coverImgName: fileName,
                thumbnailImgName: thumbName
            }
        } catch (e) {

            console.log('uploadWithCompression failed: ', e);
            throw e;

        } finally {
            this.cleanTempFolder([
                thumbnail,
                pathToCompressedFile
            ])
        }
    }

    public async uploadWithCompression({ fileName, type, filePath: path }): Promise<UploadWithCompressingResponse> {
        let pathToCompressedFile;

        try {
            // compress
            pathToCompressedFile = await this.compress({ filePath: path });

            // upload
            await this.repo.create({
                fileName,
                type,
                filePath: pathToCompressedFile
            });

            return fileName;
        } catch (e) {

            console.log('uploadWithCompression failed: ', e);
            throw e;

        } finally {

            this.cleanTempFolder(pathToCompressedFile);

        }
    }

    public async uploadEventLogo({ fileName, type, filePath: path }): Promise<string> {
        let resizedImagePath, pathToCompressedFile;

        try {
            pathToCompressedFile = await this.compress({ filePath: path });

            resizedImagePath = await this.createThumbnail(pathToCompressedFile, {
                width: 60,
                height: 50
            });

            // upload
            await this.repo.create({
                fileName,
                type,
                filePath: resizedImagePath
            });


            return fileName;

        } catch (e) {

            console.log('uploadWithCompression failed: ', e);
            throw e;

        } finally {

            this.cleanTempFolder([
                resizedImagePath,
                pathToCompressedFile
            ]);

        }
    }
}
