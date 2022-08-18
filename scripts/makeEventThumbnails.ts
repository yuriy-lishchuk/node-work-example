import * as path from "path";
import * as fs from "fs";
import db from './../database';
import {EventImagesService} from "../services/eventImages.service";
import {EventImagesRepository} from "../repositories/eventImages.repository";


(async () => {
    // make a key
    // Google Cloud - Write Service Account Key File - Uploader
    console.log(`Startup Task >> Google Cloud - Write Service Account Key File - Uploader ...`, process.env.GOOGLE_CLOUD_SA_UPLOADER_CREDS);
    fs.writeFileSync(path.join(__dirname, '..', 'routes', 'google_cloud_sa_uploader_keys.json'), process.env.GOOGLE_CLOUD_SA_UPLOADER_CREDS);
    console.log("...DONE\n");
    console.log(`Startup Task >> Google Cloud - Write Service Account Key File - Downloader ...`);
    fs.writeFileSync(path.join(__dirname, '..', 'routes', 'google_cloud_sa_downloader_keys.json'), process.env.GOOGLE_CLOUD_SA_DOWNLOADER_CREDS);
    console.log("...DONE\n");

    const imageRepo = new EventImagesRepository();
    const imagesService = new EventImagesService(imageRepo);

    const getEvents = async () => {
        return db.queryAsync(
            `
            SELECT 
            eventId,
            eventCode, 
            coverImgName,
            thumbnailImgName 
            FROM event 
            WHERE thumbnailImgName IS NULL
            AND coverImgName IS NOT NULL;
            `);
    };

    const updateEvent = async (query: { thumbName: string, eventId: number }) => {
        return db.queryAsync(
            `
            UPDATE event SET thumbnailImgName = :thumbName
            WHERE eventId = :eventId
            `, query);
    };

    const createEventThumbnails = async () => {
        // get events with empty thumbnailImgName and existing coverImgName
        const events = (await getEvents() as { eventId: number, eventCode: string, coverImgName: string }[]);

        // get all eventCoverImg
        for (let i = 0; events.length > i; i++) {
            const { coverImgName, eventCode, eventId } = events[i];

            let downloaded, thumb;

            try {
                // download file
                downloaded = await imagesService.download({ srcFilename: coverImgName });

                // create thumb
                thumb = await imagesService.createThumbnail(downloaded);
                const thumbName = await imagesService.thumbnailName(coverImgName);

                // save thumb to data base
                await imagesService.uploadWithCompression({
                    fileName: thumbName,
                    type: path.extname(thumb),
                    filePath: downloaded
                });

                // upload thumb
                await updateEvent({ thumbName, eventId });


            } catch (e) {

                console.log(`Can't update thumb for event: ${eventCode}`, e);

            } finally {

                console.log('finish');
                // clean up
                imagesService.cleanTempFolder([
                    thumb,
                    downloaded
                ]);

            }
        }

    };

    await createEventThumbnails();
})();

