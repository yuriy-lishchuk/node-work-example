var jwt = require('jsonwebtoken');
const util = require('util');

export function firstOrDefault<T>(arr: T[]): T {
    let res = null;
    if (arr && arr instanceof Array && arr.length > 0) {
        res = arr[0];
    }
    return res;
}

export function rowsToArray<T>(arr: T[], key: string): T {
    let res = null;
    if (arr && arr instanceof Array && arr.length > 0) {
        res = arr.map((row: any) => row[key]);
    }
    return res;
}

export function discardNulls<T>(obj: T): T {
    const res: T = {} as any;
    if (obj) {
        Object.keys(obj).forEach((key) => {
            if (obj[key] !== null && obj[key] !== undefined && !Number.isNaN(obj[key])) {
                res[key] = obj[key];
            }
        });
    }
    return res;
}

/**
 * Iterates over each item of the given array and create a nested object
 * which is being created by a subset of the given object. The subset objects' property
 * names will be deleted.
 * @param rows - Array of objects
 * @param nestObjPropName - The property name of the nest object
 * @param propsMap - {key: value} Objects where each key represents the property name
 * for the nest object and value is the property name of parent object. Those properties which
 * are given as values will be set to undefined.
 */
export function aggregateRowValuesAsObject<T>(
    rows: T[],
    nestObjPropName: string,
    propsMap: any
) {
    rows.map((row) => {
        const nestedObj: any = {};
        Object.keys(propsMap).map((key) => {
            // attach the value to new object
            nestedObj[key] = row[propsMap[key]];

            // remove property from the parent object
            row[propsMap[key]] = undefined;
        });
        row[nestObjPropName] = nestedObj;
    });
}

export function isValidYouTubeLink(link: string): boolean {
    var youtubeLinkPattern = /^(?:https?:\/\/)?(?:m\.|www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;
    if(!link.trim().match(youtubeLinkPattern) || !link.trim().match(youtubeLinkPattern)[1]) {
        return false;
    }
    return true;
}

export function getYouTubeVideoIDFromLink(link: string): string {
    var youtubeIDPattern = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/;
    return link.match(youtubeIDPattern)[1];
}

export function isValidEmail(email: string): boolean {
    //from https://emailregex.com/
    const emailPattern = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/;
    if(!email.toLowerCase().trim().match(emailPattern)) {
        return false;
    }
    return true;
}

export async function gcStorageUploadFromFormidableFile(fileName: string, formidableFile: any, gCloudStorageBucket: any): Promise<any> {
    const options = {
        destination: fileName,
        metadata: {
        contentType: formidableFile.type
        },
        resumable: false
    };

    return new Promise((resolve, reject) => {
        gCloudStorageBucket.upload(formidableFile.path, options, (err) => {
        if (err) {
            reject(err);
        }
        resolve(fileName);
        });
    });
}

export async function gcStorageRemoveOldEventSplashImgs(oldFileName: string, gCloudStorageBucket: any): Promise<void> {
  try {
    const oldFile = gCloudStorageBucket.file(oldFileName);
    await oldFile.delete();
  } catch (e) {
    console.warn(`Unable to remove old event slash img ${oldFileName}`);
    console.warn(e);
  }
}
  
export async function gcStorageUploadFromFileBuffer(buffer: Buffer, fileName: string, mimeType: string, gCloudStorageBucket: any): Promise<any> {
    const bucketFile = gCloudStorageBucket.file(fileName);

    const stream = bucketFile.createWriteStream({
        metadata: {
        contentType: mimeType
        },
        resumable: false
    });

    return new Promise<any>((resolve, reject) => {
        stream.on('error', (err: Error) => {
        reject(err);
        });

        stream.on('finish', async () => {
        // let resData = await bucketFile.makePublic();
        // console.log('gCloud upload res data: ' + JSON.stringify(resData));
        resolve(fileName);
        });

        stream.end(buffer);
    });
}

export async function generateReadGCloudBucketFileSignedURL(gCloudBucket: any, fileName: string, ttlSeconds: number): Promise<string> {
    let expiry = new Date(new Date().getTime() + ttlSeconds * 1000).toISOString().replace(/\.\d*Z$/, 'Z');
    const gCloudAuthDownloadConfig = {
      action: 'read',
      expires: expiry
    };

    return new Promise((resolve, reject) => {
        gCloudBucket.file(fileName).getSignedUrl(gCloudAuthDownloadConfig, (err, url) => {
          if (err) {
            console.log(err);
            reject(err);
          }
          resolve(url);
        });
      });
}

export function getMimeTypeExtension(mimeType: string): string {
    let knownTypes = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'image/tiff': '.tiff',
    }
    return knownTypes[mimeType.toLowerCase()] ? knownTypes[mimeType.toLowerCase()] : '';
}

/**
 *
 * @param data - The payload which needs to be encoded
 * @param expiresIn - optional argument, which indicates the number
 * of seconds that the string is valid. This is availble in decoded data
 */
export function encodeData(data: any, expiresIn?: number): Promise<string> {
    return util.promisify(jwt.sign)(data, process.env.JWT_SECRET, { expiresIn });
}

/**
 *
 * @param token - The token which needs to be dencoded */
export function decodeToken(token: string): any {
    return util.promisify(jwt.verify)(token, process.env.JWT_SECRET);
}
