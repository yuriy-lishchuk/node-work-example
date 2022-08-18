import { Tag } from './tag';

export interface Presentation {
    presentationId: number;
    institutionId: number;
    presenterEmail: string;
    eventId: number;
    institutionSetUniquePresentationId?: string;
    hash: string;
    createDate: string;
    presenters: Array<any>;
    title: string;
    abstract: string;
    subjects: Array<string>;
    voiceoverId: string;
    originalVoiceoverLink: string;
    presentationVideoId: string;
    primaryPresenterBiography: string;
    originalPresentationVideoLink: string;
    posterId: string;
    slidesId: string;
    presentationType: string;
    posterType: string;
    posterFileURL?: string;
    posterThumbnailImageURL?: string;
    slidesFileURL?: string;
    tags: Tag[];
    extraValues: any;
    customFields: any;
}

export interface GetPresentationsQueryParams {
    eventId: number,
    hash: string
    query: string,
    limit: number,
}
