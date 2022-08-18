export interface PresentationFormConfig {
  general: GeneralConfig;
  presenterFields: PresenterFieldsConfig;
  presentationFields: PresentationFieldsConfig;
  mediaFields: MediaFieldsConfig;
}

export interface GeneralConfig {
  instructions: string;
}

export interface PresenterFieldsConfig {
  presenterTitle: string;
  maxAddlPresenters: number;
  firstNameDescription: string;
  lastNameDescription: string;
  emailDescription: string;
  level: CustomMultiSelectFormField;
  major: CustomInputFormField;
  extraFields?: Array<CustomInputFormField|CustomMultiSelectFormField>;
}

export interface PresentationFieldsConfig {
  title: CustomInputFormField;
  abstract: CustomInputFormField;
  subjects: CustomMultiSelectFormField;
  extraFields?: Array<CustomInputFormField|CustomMultiSelectFormField>;
}

export interface MediaFieldsConfig {
  poster: PosterMediaFieldsConfig;
  oral: OralMediaFieldsConfig;
  exhibition: ExhibitionMediaFieldsConfig;
}

export interface PosterMediaFieldsConfig {
  isDisplayed: boolean;
  label: string;
  isOptionalFieldDisplayed: boolean;
  posterUploadDescription: string;
  voiceoverVideoLinkDescription: string;
}

export interface OralMediaFieldsConfig {
  isDisplayed: boolean;
  label: string;
  isOptionalFieldDisplayed: boolean;
  presentationVideoLinkDescription: string;
  slidesUploadDescription: string;
}

export interface ExhibitionMediaFieldsConfig {
  isDisplayed: boolean;
  label: string;
  isOptionalFieldDisplayed: boolean;
  presentationVideoLinkDescription: string;
  voiceoverVideoLinkDescription: string;
}

export interface CustomInputFormField {
  isDisplayed: boolean;
  isRequired: boolean;
  isShownInSummary: boolean;
  hash?: string;
  label: string;
  description: string;
  type: 'text' | 'number' | 'wysiwyg';
  optionLabels?: Array<string>; // TODO: Is this needed?
}

export interface CustomMultiSelectFormField {
  isDisplayed: boolean;
  isRequired: boolean;
  isShownInSummary: boolean;
  hash?: string;
  label: string;
  description: string;
  type: 'radio' | 'checkbox';
  optionLabels: Array<string>;
  canFilter: boolean;
}

export const DEFAULT_GENERAL_CONFIG: GeneralConfig = {
  instructions: 'Please fill out the following form with your poster or presentation information. ' + 
    'Please only submit one form per presentation, and please note that this submission is final.'
};

export const DEFAULT_PRESENTER_FIELDS_CONFIG: PresenterFieldsConfig = {
  presenterTitle: 'Presenter',
  maxAddlPresenters: 7,
  firstNameDescription: '',
  lastNameDescription: '',
  emailDescription: '',
  level: {
    isDisplayed: true,
    isRequired: true,
    isShownInSummary: false,
    hash: null,
    label: 'Level',
    description: '',
    type: 'radio',
    optionLabels: [
      'Freshman',
      'Sophomore',
      'Junior',
      'Senior',
      'Associate\'s Degree Student',
      'Graduate Student',
      'Postdoctoral Fellow',
      'Faculty'
    ],
    canFilter: false
  },
  major: {
    isDisplayed: true,
    isRequired: true,
    isShownInSummary: false,
    hash: null,
    label: 'Major',
    description: '',
    type: 'text'
  },
  extraFields: []
};

export const DEFAULT_PRESENTATION_FIELDS_CONFIG: PresentationFieldsConfig = {
  title: {
    isDisplayed: true,
    isRequired: true,
    isShownInSummary: false,
    hash: null,
    label: 'Title',
    description: '',
    type: 'wysiwyg'
  },
  abstract: {
    isDisplayed: true,
    isRequired: true,
    isShownInSummary: false,
    hash: null,
    label: 'Abstract Or Description',
    description: 'Please note when pasting your abstract, certain formatting ' + 
        '(e.g. bold, italics, etc.) may not be kept. Please double check your abstract ' + 
        'and re-add formatting where necessary.',
    type: 'wysiwyg'
  },
  subjects: {
    isDisplayed: true,
    isRequired: true,
    isShownInSummary: false,
    hash: null,
    label: 'Subject',
    description: '',
    type: 'checkbox',
    optionLabels: [
      'Arts, Design, and Performing Arts',
      'Biological & Life Sciences',
      'Business & Economics',
      'Chemical Sciences',
      'Computational Sciences',
      'Cultural & Language Studies',
      'Communication & Journalism',
      'Education',
      'Environmental Sciences',
      'Engineering',
      'Humanities',
      'Mathematics & Quantitative Studies',
      'Medical & Health Sciences',
      'Physical Sciences & Astronomy',
      'Social & Behavioral Sciences'
    ],
    canFilter: true
  },
  extraFields: []
};

export const DEFAULT_MEDIA_FIELDS_CONFIG: MediaFieldsConfig = {
  poster: {
    isDisplayed: true,
    label: 'Poster / Slides (PDF + Video)',
    posterUploadDescription: 'Upload a PDF of your poster. PDF must be no more than 10MB in size.  If your file ' +
      'exceeds this limit, you can compress the file to reduce its size.  We recommend Smallpdf.com or another ' +
      'online tool to compress your file if necessary.',
    isOptionalFieldDisplayed: true,
    voiceoverVideoLinkDescription: 'Please upload a video (2-5 mins recommended) of you describing your work/poster ' +
        'to YouTube and paste the link below (only YouTube links will be supported). Please make the ' +
        'YouTube video settings as UNLISTED.'
  },
  oral: {
    isDisplayed: true,
    label: 'Oral (Video)',
    presentationVideoLinkDescription: 'Please upload your oral presentation to YouTube and paste the link below (only ' +
        'YouTube links will be supported). Please make the YouTube video settings as UNLISTED.',
    isOptionalFieldDisplayed: true,
    slidesUploadDescription: '(Optional) Upload a PDF of your slides or other supporting document. ' +
        'PDF must be no more than 10MB in size.  If your file exceeds this limit, you can compress the file to reduce ' +
        'its size.  We recommmend Smallpdf.com or another online tool to compress your file if necessary.'
  },
  exhibition: {
    isDisplayed: true,
    label: 'Exhibit, Performance, or Demonstration (Video + Video)',
    presentationVideoLinkDescription: 'Please upload a video of your exhibit or performance to YouTube and paste the ' +
        'link below (only YouTube links will be supported). Please make the YouTube video settings as UNLISTED.',
    isOptionalFieldDisplayed: true,
    voiceoverVideoLinkDescription: 'Please upload a video (2-5mins recommended) of you describing your ' +
        'exhibit/performance to YouTube and paste the link below (only YouTube links will be supported). ' +
        'Please make the YouTube video settings as UNLISTED.'
  }
};

export const DEFAULT_CUSTOM_INPUT_FORM_FIELD_CONFIG: CustomInputFormField = {
  isDisplayed: true,
  isRequired: true,
  isShownInSummary: false,
  label: 'New Short Answer',
  description: '',
  type: 'text'
};

export const DEFAULT_CUSTOM_MULTI_SELECT_FORM_FIELD_CONFIG: CustomMultiSelectFormField = {
  isDisplayed: true,
  isRequired: true,
  isShownInSummary: false,
  label: 'New Multi-Select',
  description: '',
  optionLabels: [],
  type: 'radio',
  canFilter: false
};

export const DEFAULT_PRESENTATION_FROM_CONFIG: PresentationFormConfig = {
  general: DEFAULT_GENERAL_CONFIG,
  presenterFields: DEFAULT_PRESENTER_FIELDS_CONFIG,
  presentationFields: DEFAULT_PRESENTATION_FIELDS_CONFIG,
  mediaFields: DEFAULT_MEDIA_FIELDS_CONFIG,
}
