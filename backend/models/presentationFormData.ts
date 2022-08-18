export interface PresentationFormData {
    presenterData: PresenterData[];
    presentationData: PresentationData;
    presentationType: string;
    presentationMediaData: PosterPresentationMediaData|OralPresentationMediaData|ExhibitionPresentationMediaData
}

export interface PresenterData {
    firstName: string;
    lastName: string;
    email: string;
    level: string;
    major: string;
    extraValues?: any;
}

export interface PresentationData {
    title: string;
    abstract: string;
    subjects: string[];
    extraValues?: any;
}

export interface PosterPresentationMediaData {
    voiceoverVideoLink: string;
}

export interface OralPresentationMediaData {
    presentationVideoLink: string;
}

export interface ExhibitionPresentationMediaData {
    presentationVideoLink: string;
    voiceoverVideoLink: string;
}
