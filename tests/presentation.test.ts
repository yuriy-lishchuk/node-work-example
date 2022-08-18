
import 'jest'
import { isValidEmail, isValidYouTubeLink } from '../functions'
import { describe, expect, test, it, beforeEach } from '@jest/globals'
import * as submissionDataModels from '../models/presentationFormData';
import * as submissionFormModels from '../models/presentationFormConfig';
import { DEFAULT_PRESENTATION_FROM_CONFIG } from '../models/presentationFormConfig';

let presMock = {
    presenterData: [
        {
            firstName: 'Tony',
            lastName: 'Kentuki',
            email: 'test@gmai.com',
            level: 'Freshman',
            major: 'test',
            extraValues: []
        }
    ],
    presentationData: {
        title: 'testTitle',
        abstract: 'abstract-test',
        subjects: ['Jason Mens', 'Test tests'],
        extraValues: []
    },
    presentationType: "test",
    presentationMediaData: {
        voiceoverVideoLink: "https://www.youtube.com/watch?v=CVClHLwv-4I",
        presentationVideoLink: "https://www.youtube.com/watch?v=CVClHLwv-4I"
    }
}

let evenFormConfigMock = DEFAULT_PRESENTATION_FROM_CONFIG;
let uploadedFilesMock;
let eventIdMock = 24;
let isEditModeMock = true;
let ErrorArr = [];


beforeEach(() => {
    uploadedFilesMock = 'file'
    isEditModeMock = true;
    eventIdMock = 24
    evenFormConfigMock = DEFAULT_PRESENTATION_FROM_CONFIG;
});

//   evenFormConfigMock.presenterFields.extraFields.push({
//     isDisplayed: true,
//     isRequired: true,
//     isShownInSummary: false,
//     label: 'New Short Answer',
//     description: '',
//     type: 'text'
//   })
// SUCCESS TESTS
it('form submision check eventId and presData exist', () => {
    expect(ErrorArr.length === 0).toBeTruthy();
    expect(!eventIdMock || !presMock).toBeFalsy();
})

describe('first presenter data testing on passed condition', () => {
    it('check if presentier data exist ', () => {
        expect(presMock.presenterData && presMock.presenterData[0]).toBeTruthy();
        expect(ErrorArr.length === 0).toBeTruthy();
    });

    it('check if presenterData first name exist and is it string', () => {
        expect(presMock.presenterData[0].firstName).toBeTruthy();
        expect(typeof presMock.presenterData[0].firstName !== 'string').toBeFalsy();
        expect(ErrorArr.length === 0).toBeTruthy();
    })

    it('check if presenterData last name exist and is it string', () => {
        expect(presMock.presenterData[0].lastName).toBeTruthy();
        expect(typeof presMock.presenterData[0].lastName !== 'string').toBeFalsy();
        expect(ErrorArr.length === 0).toBeTruthy();
    })

    it('check if presenterData email exist and is it string, plus validate', () => {
        expect(presMock.presenterData[0].email).toBeTruthy();
        expect(typeof presMock.presenterData[0].email !== 'string').toBeFalsy();
        expect(!isValidEmail(presMock.presenterData[0].email)).toBeFalsy();
        expect(ErrorArr.length === 0).toBeTruthy();
    })
});

describe('check PresentationData fields', () => {
    it('check if presentationData title exist and is it string,', () => {
        expect(presMock.presentationData.title).toBeTruthy();
        expect(typeof presMock.presentationData.title !== 'string').toBeFalsy();
        expect(ErrorArr.length === 0).toBeTruthy();
    })

    it('check if presentationData abstract exist and is it string,', () => {
        expect(presMock.presentationData.abstract).toBeTruthy();
        expect(typeof presMock.presentationData.abstract !== 'string').toBeFalsy();
        expect(ErrorArr.length === 0).toBeTruthy();
    })
})

describe('check Presentation media fields', () => {
    it('check if EditMode true', () => {
        expect(isEditModeMock).toBeTruthy();
        expect(ErrorArr.length === 0).toBeTruthy();
    })

    it('check if presentation type field not null and equals string', () => {
        expect(presMock.presentationType).toBeTruthy();
        expect(typeof presMock.presentationType !== 'string').toBeFalsy();
        expect(ErrorArr.length === 0).toBeTruthy();
    })

    it('check if presentation media data field not null', () => {
        expect(presMock.presentationMediaData).toBeTruthy();
        expect(ErrorArr.length === 0).toBeTruthy();
    })

    it('check case with poster', () => {
        uploadedFilesMock = {
            poster: "poster"
        }
        let posterMedia = presMock.presentationMediaData as submissionDataModels.PosterPresentationMediaData;
        expect(uploadedFilesMock.poster).toBeTruthy();
        expect(posterMedia.voiceoverVideoLink).toBeTruthy();
        expect(typeof posterMedia.voiceoverVideoLink !== 'string' ||
            !isValidYouTubeLink(posterMedia.voiceoverVideoLink)).toBeFalsy();
        expect(ErrorArr.length === 0).toBeTruthy();
    })

    it('check case with oral', () => {
        let oralMedia = presMock.presentationMediaData as submissionDataModels.OralPresentationMediaData;
        expect(oralMedia.presentationVideoLink).toBeTruthy();
        expect(typeof oralMedia.presentationVideoLink !== 'string' ||
            !isValidYouTubeLink(oralMedia.presentationVideoLink)).toBeFalsy();
        expect(ErrorArr.length === 0).toBeTruthy();
    })

    it('check case with exhibition', () => {
        let demoMedia = presMock.presentationMediaData as submissionDataModels.ExhibitionPresentationMediaData;
        expect(demoMedia.presentationVideoLink).toBeTruthy();
        expect(typeof demoMedia.presentationVideoLink !== 'string' ||
            !isValidYouTubeLink(demoMedia.presentationVideoLink)).toBeFalsy();
        expect(demoMedia.voiceoverVideoLink).toBeTruthy();
        expect(typeof demoMedia.voiceoverVideoLink !== 'string' ||
            !isValidYouTubeLink(demoMedia.voiceoverVideoLink)).toBeFalsy();
        expect(ErrorArr.length === 0).toBeTruthy();
    });

})

describe('validate mandatory required fields based on custom configuration', () => {
    let validPresentersCount = 1;
    let testObj = {
        firstName: 'James',
        lastName: 'Sanders',
        email: 'test@yandex.com',
        level: 'Freshman',
        major: 'test',
        extraValues: []
    }
    describe('check the presenter data', () => {
        it('check if valid presenter count passes', () => {
            validPresentersCount = 1;
            validPresentersCount += Math.min(evenFormConfigMock.presenterFields.maxAddlPresenters, presMock.presenterData.length - 1)
            expect(evenFormConfigMock.presenterFields.maxAddlPresenters).toBeTruthy();
            expect(presMock.presenterData.length > 1).toBeTruthy();
            expect(evenFormConfigMock.presenterFields.maxAddlPresenters && presMock.presenterData.length > 1).toBeTruthy();
            expect(validPresentersCount).toBe(2);
            expect(ErrorArr.length === 0).toBeTruthy();
        })

        describe('check if presenter data array elements are correct', () => {
            validPresentersCount = 2
            presMock.presenterData.push(testObj)
            for (let p = 0; p < validPresentersCount; p++) {
                let currentPresenter = presMock.presenterData[p];

                it(`check if first name exist in presMock.presenterData[${p}]`, () => {
                    expect(currentPresenter.firstName).toBeTruthy();
                });

                it(`check if first name is an string in presMock.presenterData[${p}]`, () => {
                    expect(typeof currentPresenter.firstName !== 'string').toBeFalsy();
                });

                it(`check if last name exist in presMock.presenterData[${p}]`, () => {
                    expect(currentPresenter.lastName).toBeTruthy();
                });

                it(`check if last name is an string in presMock.presenterData[${p}]`, () => {
                    expect(typeof currentPresenter.lastName !== 'string').toBeFalsy();
                });

                it(`check if email exist in presMock.presenterData[${p}]`, () => {
                    expect(currentPresenter.email).toBeTruthy();
                });

                it(`check if email is an srting and validate in presMock.presenterData[${p}]`, () => {
                    expect(typeof currentPresenter.email !== 'string').toBeFalsy();
                    expect(!isValidEmail(currentPresenter.email)).toBeFalsy();
                });

                it(`check if level isDisaplayed on presMock.presenterData[${p}] is true and check for level validation`, () => {
                    expect(evenFormConfigMock.presenterFields.level.isDisplayed)
                    // THIS CONDITION BELLOW SHOULD GIVE FALSE - SUCCESS CONDITION
                    expect(!evenFormConfigMock.presenterFields.level.optionLabels.find(label => {
                        return typeof currentPresenter.level === 'string' &&
                            currentPresenter.level.toLowerCase() === label.toLowerCase();
                    })).toBeFalsy();
                });

                it(`check if major exist on presMock.presenterData[${p}], check with eventFormConfig`, () => {
                    expect(evenFormConfigMock.presenterFields.major.isDisplayed &&
                        evenFormConfigMock.presenterFields.major.isRequired).toBeTruthy();
                    expect(currentPresenter.major).toBeTruthy();
                    expect(typeof currentPresenter.major !== 'string').toBeFalsy();
                });


                it(`check the forEach part for evenFormConfigMock.presenterFields.extraFields`, () => {
                    evenFormConfigMock.presenterFields.extraFields.forEach(fieldConfig => {
                        expect(fieldConfig.isDisplayed).toBeTruthy();
                        expect(!currentPresenter.extraValues ||
                            (!currentPresenter.extraValues[fieldConfig.hash] &&
                                (fieldConfig.type !== 'number') || currentPresenter.extraValues[fieldConfig.hash] !== '0') ||
                            fieldConfig.type === 'checkbox' && !currentPresenter.extraValues[fieldConfig.hash].length).toBeFalsy();
                    });
                });

                it(`check the type validation on fieldConfig.type case - radio`, () => {
                    evenFormConfigMock.presenterFields.extraFields.forEach(fieldConfig => {
                        let matchingLabel = (fieldConfig as submissionFormModels.CustomMultiSelectFormField).optionLabels.find(label => {
                            return typeof currentPresenter.extraValues[fieldConfig.hash] === 'string' &&
                                currentPresenter.extraValues[fieldConfig.hash].toLowerCase() === label.toLowerCase();
                        });
                        expect(matchingLabel).toBeTruthy();
                    });
                });

                it(`check the type validation on fieldConfig.type case - checkbox`, () => {
                    evenFormConfigMock.presenterFields.extraFields.forEach(fieldConfig => {
                        for (let i = 0; i < currentPresenter.extraValues[fieldConfig.hash].length; i++) {
                            let matchingLabel = (fieldConfig as submissionFormModels.CustomMultiSelectFormField).optionLabels.find(label => {
                                return typeof currentPresenter.extraValues[fieldConfig.hash][i] === 'string' &&
                                    currentPresenter.extraValues[fieldConfig.hash][i].toLowerCase() === label.toLowerCase();
                            });
                            expect(matchingLabel).toBeTruthy()
                        };
                        expect(currentPresenter.extraValues[fieldConfig.hash].length === undefined).toBeFalsy();
                    });
                });

                it(`check the type validation on fieldConfig.type case - number`, () => {
                    evenFormConfigMock.presenterFields.extraFields.forEach(fieldConfig => {
                        expect(isNaN(currentPresenter.extraValues[fieldConfig.hash])).toBeFalsy();
                    });
                });

                it(`check the type validation on fieldConfig.type case - default`, () => {
                    evenFormConfigMock.presenterFields.extraFields.forEach(fieldConfig => {
                        expect(typeof currentPresenter.extraValues[fieldConfig.hash] !== 'string').toBeFalsy();
                    });
                });

            }
            expect(ErrorArr.length === 0).toBeTruthy();
        });

        describe('check if presentation data is correct', () => {

            it('check if subjects are true', () => {
                expect(evenFormConfigMock.presentationFields.subjects.isDisplayed).toBeTruthy();
            });

            it('check if subjects data in presenter data are true, but condition false', () => {
                expect(!presMock.presentationData.subjects || !presMock.presentationData.subjects.length).toBeFalsy();
                expect(evenFormConfigMock.presentationFields.subjects.isRequired).toBeTruthy();
            });

            it('check if all values are valid in subjects', () => {
                evenFormConfigMock.presentationFields.subjects.optionLabels.push('Jason Mens', 'Test tests')
                for (let i = 0; i < presMock.presentationData.subjects.length; i++) {
                    let matchingSubject = evenFormConfigMock.presentationFields.subjects.optionLabels.find(label => {
                        return typeof presMock.presentationData.subjects[i] === 'string' &&
                            presMock.presentationData.subjects[i].toLowerCase() === label.toLowerCase();
                    });
                    expect(matchingSubject).toBeTruthy();
                };
            });

            it(`check the forEach part for evenFormConfigMock.presenterFields.extraFields`, () => {
                evenFormConfigMock.presenterFields.extraFields.forEach(fieldConfig => {
                    expect(fieldConfig.isDisplayed).toBeTruthy();
                    expect(!presMock.presentationData.extraValues ||
                        (!presMock.presentationData.extraValues[fieldConfig.hash] &&
                            (fieldConfig.type !== 'number') || presMock.presentationData.extraValues[fieldConfig.hash] !== '0') ||
                        fieldConfig.type === 'checkbox' && !presMock.presentationData.extraValues[fieldConfig.hash].length).toBeFalsy();
                });
            });

            it(`check the type validation on fieldConfig.type case - radio`, () => {
                evenFormConfigMock.presenterFields.extraFields.forEach(fieldConfig => {
                    let matchingLabel = (fieldConfig as submissionFormModels.CustomMultiSelectFormField).optionLabels.find(label => {
                        return typeof presMock.presentationData.extraValues[fieldConfig.hash] === 'string' &&
                            presMock.presentationData.extraValues[fieldConfig.hash].toLowerCase() === label.toLowerCase();
                    });
                    expect(matchingLabel).toBeTruthy();
                });
            });

            it(`check the type validation on fieldConfig.type case - checkbox`, () => {
                evenFormConfigMock.presenterFields.extraFields.forEach(fieldConfig => {
                    for (let i = 0; i < presMock.presentationData.extraValues[fieldConfig.hash].length; i++) {
                        let matchingLabel = (fieldConfig as submissionFormModels.CustomMultiSelectFormField).optionLabels.find(label => {
                            return typeof presMock.presentationData.extraValues[fieldConfig.hash][i] === 'string' &&
                                presMock.presentationData.extraValues[fieldConfig.hash][i].toLowerCase() === label.toLowerCase();
                        });
                        expect(matchingLabel).toBeTruthy()
                    }
                    expect(presMock.presentationData.extraValues[fieldConfig.hash].length === undefined).toBeFalsy();
                })
            });

            it(`check the type validation on fieldConfig.type case - number`, () => {
                evenFormConfigMock.presenterFields.extraFields.forEach(fieldConfig => {
                    expect(isNaN(presMock.presentationData.extraValues[fieldConfig.hash])).toBeFalsy();
                });
            });

            it(`check the type validation on fieldConfig.type case - default`, () => {
                evenFormConfigMock.presenterFields.extraFields.forEach(fieldConfig => {
                    expect(typeof presMock.presentationData.extraValues[fieldConfig.hash] !== 'string').toBeFalsy();
                });
            });
        });
    });
});

// FAILED TESTS
it('form submision check eventId and presData non exist', () => {
    eventIdMock = null;
    ErrorArr.push('invalid form submission, missing request data');
    expect(!eventIdMock || !presMock).toBeTruthy();
    expect(ErrorArr.length === 0).toBeFalsy();
    expect(ErrorArr.includes('invalid form submission, missing request data')).toBeTruthy();
})

describe('first presenter data testing on failed condition', () => {
    it('check if presentier data exist ', () => {
        ErrorArr.push("missing required field 'presenterData'");
        expect(!presMock.presenterData && presMock.presenterData[0]).toBeFalsy();

    });

    it('first name exist fail', () => {
        presMock.presenterData[0].firstName = null;
        expect(presMock.presenterData[0].firstName).toBeFalsy();
        ErrorArr.push("missing required field 'presenterData[0].firstName'");
    })

    it('first name is string fail', () => {
        expect(typeof presMock.presenterData[0].firstName !== 'string').toBeTruthy()
        ErrorArr.push("invalid field 'presenterData[0].firstName'");
    })

    it('last name exist fail', () => {
        presMock.presenterData[0].lastName = null;
        expect(presMock.presenterData[0].lastName).toBeFalsy();
        ErrorArr.push("missing required field 'presenterData[0].lastName'");
    })

    it('last name is string fail', () => {
        expect(typeof presMock.presenterData[0].lastName !== 'string').toBeTruthy();
        ErrorArr.push("invalid field 'presenterData[0].lastName'");
    })

    it('email exist fail', () => {
        expect(!presMock.presenterData[0].email).toBeFalsy();
        ErrorArr.push("missing required field 'presenterData[0].email'");
    })

    it('email is string fail and validate', () => {
        expect(!isValidEmail(presMock.presenterData[0].email)).toBeFalsy();
        expect(typeof !presMock.presenterData[0].email !== 'string').toBeTruthy();
        ErrorArr.push("invalid field 'presenterData[0].email'");
    })

    it('check if presenterData has errors', () => {
        expect(ErrorArr.length === 0).toBeFalsy()
        expect(ErrorArr.includes("missing required field 'presenterData'")).toBeTruthy();
        expect(ErrorArr.includes("missing required field 'presenterData[0].firstName'")).toBeTruthy();
        expect(ErrorArr.includes("invalid field 'presenterData[0].firstName'")).toBeTruthy();
        expect(ErrorArr.includes("missing required field 'presenterData[0].lastName'")).toBeTruthy();
        expect(ErrorArr.includes("invalid field 'presenterData[0].lastName'")).toBeTruthy();
        expect(ErrorArr.includes("missing required field 'presenterData[0].email'")).toBeTruthy();
        expect(ErrorArr.includes("invalid field 'presenterData[0].email'")).toBeTruthy();
    })

    describe('check if PresentationData fail', () => {
        it('check if presentationData title exist', () => {
            presMock.presentationData.title = null
            expect(presMock.presentationData.title).toBeFalsy();
            ErrorArr.push("missing required field 'presentationData.title'");
        })

        it('check if presentationData title is it string,', () => {
            expect(typeof presMock.presentationData.title !== 'string').toBeTruthy();
            ErrorArr.push("invalid field 'presentationData.title'");
        })

        it('check if presentationData abstract exist', () => {
            presMock.presentationData.abstract = null
            expect(presMock.presentationData.abstract).toBeFalsy();
            ErrorArr.push("missing required field 'presentationData.abstract'");
        })

        it('check if presentationData abstract is it string,', () => {
            expect(typeof presMock.presentationData.abstract !== 'string').toBeTruthy();
            ErrorArr.push("invalid field 'presentationData.abstract'");
        })

        it('check errors on title', () => {
            expect(ErrorArr.includes("missing required field 'presentationData.title'")).toBeTruthy();
            expect(ErrorArr.includes("invalid field 'presentationData.title'")).toBeTruthy();
            expect(ErrorArr.includes("missing required field 'presentationData.abstract'")).toBeTruthy();
            expect(ErrorArr.includes("invalid field 'presentationData.abstract'")).toBeTruthy();
        })
    })

    describe('check Presentation media fields to fail', () => {
        it('check if editMode false', () => {
            isEditModeMock = false;
            expect(isEditModeMock).toBeFalsy();
        });

        it('check if presentation media type exist', () => {
            expect(!presMock.presentationType).toBeFalsy();
            expect(typeof !presMock.presentationType !== 'string').toBeTruthy();
            ErrorArr.push("missing required field 'presentationType'");
        });

        it('check if presentation media type is a string', () => {
            expect(typeof !presMock.presentationType !== 'string').toBeTruthy();
            ErrorArr.push("invalid field 'presentationType'");
        });

        it('check if presentation media data exist', () => {
            expect(!presMock.presentationMediaData).toBeFalsy();
            ErrorArr.push("missing required field 'presentationMediaData'");
        });

        describe('check case with poster to fail', () => {
            it('check if file exist', () => {
                uploadedFilesMock = {
                    poster: null
                }
                expect(uploadedFilesMock.poster).toBeFalsy();
                ErrorArr.push("missing required file 'poster'")
            })

            it('check if presentationMediaData fails', () => {
                presMock.presentationMediaData.voiceoverVideoLink = "http://somesite.com"
                let posterMedia = presMock.presentationMediaData as submissionDataModels.PosterPresentationMediaData;
                expect(posterMedia.voiceoverVideoLink &&
                    (typeof posterMedia.voiceoverVideoLink !== 'string' ||
                        !isValidYouTubeLink(posterMedia.voiceoverVideoLink))).toBeTruthy()
                ErrorArr.push("invalid field 'presentationMediaData.voiceoverVideoLink'")
            })
        })

        describe('check case with oral to fail', () => {
            let oralMedia = presMock.presentationMediaData as submissionDataModels.OralPresentationMediaData;
            it('check if the presentationVideoLink exist fail', () => {
                expect(!oralMedia.presentationVideoLink).toBeFalsy();
                ErrorArr.push("missing required field 'presentationMediaData.presentationVideoLink'")
            })

            it('check if the presentationVideoLink is a string and validate to fail', () => {
                presMock.presentationMediaData.presentationVideoLink = 'htttp://random.com'
                expect(typeof !oralMedia.presentationVideoLink !== 'string'
                    || !isValidYouTubeLink(oralMedia.presentationVideoLink)).toBeTruthy();
                ErrorArr.push("invalid field 'presentationMediaData.presentationVideoLink'")
            })
        })

        describe('check case with exhibition to fail', () => {
            let demoMedia = presMock.presentationMediaData as submissionDataModels.ExhibitionPresentationMediaData;
            it('check if demoMedia presentationVideoLink exist to fail', () => {
                expect(!demoMedia.presentationVideoLink).toBeFalsy();
                ErrorArr.push("missing required field 'presentationMediaData.presentationVideoLink'")
            });

            it('check if demoMedia presentationVideoLink is a string or validate to fail', () => {
                expect(typeof !demoMedia.presentationVideoLink !== 'string'
                    || !isValidYouTubeLink(demoMedia.presentationVideoLink)).toBeTruthy();
                ErrorArr.push("invalid field 'presentationMediaData.presentationVideoLink'");
            });

            it('check if demoMedia voiceoverVideoLink exist, string and validate to fail', () => {
                expect(!demoMedia.voiceoverVideoLink &&
                    typeof !demoMedia.voiceoverVideoLink !== 'string' ||
                    !isValidYouTubeLink(demoMedia.voiceoverVideoLink)).toBeTruthy();
                ErrorArr.push("invalid field 'presentationMediaData.voiceoverVideoLink'")
            })
        })

        it('check presentation media errors', () => {
            expect(ErrorArr.includes("missing required field 'presentationType'")).toBeTruthy();
            expect(ErrorArr.includes("invalid field 'presentationType'")).toBeTruthy();
            expect(ErrorArr.includes("missing required field 'presentationMediaData'")).toBeTruthy();
            expect(ErrorArr.includes("missing required file 'poster'")).toBeTruthy();
            expect(ErrorArr.includes("invalid field 'presentationMediaData.voiceoverVideoLink'")).toBeTruthy();
            expect(ErrorArr.includes("missing required field 'presentationMediaData.presentationVideoLink'")).toBeTruthy();
            expect(ErrorArr.includes("invalid field 'presentationMediaData.presentationVideoLink'")).toBeTruthy();
        });
    });
});

describe('validate mandatory required fields based on custom configuration to fail', () => {
    let validPresentersCount = 1;
    ErrorArr = []
    let testObj = {
        firstName: 'James',
        lastName: 'Sanders',
        email: 'test@yandex.com',
        level: 'Freshman',
        major: 'test',
        extraValues: []
    }
    describe('check the presenter data fail', () => {
        it('check if valid presenter count fails', () => {
            validPresentersCount = 1;
            let arrPresenterData = presMock.presenterData
            arrPresenterData = [];
            validPresentersCount += Math.min(evenFormConfigMock.presenterFields.maxAddlPresenters, arrPresenterData.length - 1)
            expect(!evenFormConfigMock.presenterFields.maxAddlPresenters).toBeFalsy();
            expect(arrPresenterData.length > 1).toBeFalsy();
            expect(!evenFormConfigMock.presenterFields.maxAddlPresenters && arrPresenterData.length > 1).toBeFalsy();
            // There is no error to push here
        })

        describe('check if presenter data array elements are failed', () => {
            let arrPresenterData = presMock.presenterData
            validPresentersCount = 2
            for (let p = 0; p < validPresentersCount; p++) {
                let currentPresenter = arrPresenterData[p];

                it(`check if first name not exist in presMock.presenterData[${p}]`, () => {
                    arrPresenterData[p]['firstName'] = null
                    expect(currentPresenter.firstName).toBeFalsy();
                    ErrorArr.push(`missing required field 'presenterData[${p}].firstName'`);
                });

                it(`check if first name is not an string in presMock.presenterData[${p}]`, () => {
                    expect(typeof currentPresenter.firstName !== 'string').toBeTruthy();
                    ErrorArr.push(`invalid field 'presenterData[${p}].firstName'`);
                });

                it(`check if last name not exist in presMock.presenterData[${p}]`, () => {
                    arrPresenterData[p]['lastName'] = null
                    expect(currentPresenter.lastName).toBeFalsy();
                    ErrorArr.push(`missing required field 'presenterData[${p}].lastName'`);
                });

                it(`check if last name is not an string in presMock.presenterData[${p}]`, () => {
                    expect(typeof currentPresenter.lastName !== 'string').toBeTruthy();
                    ErrorArr.push(`invalid field 'presenterData[${p}].lastName'`);
                });

                it(`check if email not exist in presMock.presenterData[${p}]`, () => {
                    arrPresenterData[p]['email'] = null
                    expect(currentPresenter.email).toBeFalsy();
                    ErrorArr.push(`missing required field 'presenterData[${p}].email'`);
                });

                it(`check if email is an srting and validate in presMock.presenterData[${p}] to fail`, () => {
                    expect(typeof currentPresenter.email !== 'string').toBeTruthy();
                    arrPresenterData[p]['email'] = 'somestring'
                    expect(!isValidEmail(currentPresenter.email)).toBeTruthy();
                    ErrorArr.push(`invalid field 'presenterData[${p}].email'`);
                });

                it(`check if level isDisaplayed on presMock.presenterData[${p}] is false and check for level validation to fails`, () => {
                    expect(!evenFormConfigMock.presenterFields.level.isRequired).toBeFalsy()
                    ErrorArr.push(`missing required field 'presenterData[${p}].level'`);
                    expect(!evenFormConfigMock.presenterFields.level.isDisplayed).toBeFalsy()
                    // THIS CONDITION BELLOW SHOULD GIVE TRUE - FAIL CONDITION
                    expect(evenFormConfigMock.presenterFields.level.optionLabels.find(label => {
                        return typeof currentPresenter.level === 'string' &&
                            currentPresenter.level.toLowerCase() === label.toLowerCase();
                    })).toBeTruthy();
                    ErrorArr.push(`invalid field 'presenterData[${p}].level'`);
                });

                it(`check if major not exist on presMock.presenterData[${p}], check with eventFormConfig`, () => {
                    let majorDisplay = evenFormConfigMock.presenterFields.major.isDisplayed;
                    majorDisplay = false;
                    expect(majorDisplay &&
                        evenFormConfigMock.presenterFields.major.isRequired).toBeFalsy();
                        ErrorArr.push(`missing required field 'presenterData[${p}].major'`);
                    currentPresenter['major'] = null;
                    expect(currentPresenter.major).toBeFalsy();
                    expect(typeof currentPresenter.major !== 'string').toBeTruthy();
                    ErrorArr.push(`invalid field 'presenterData[${p}].major'`);
                });


                it(`check the forEach part for evenFormConfigMock.presenterFields.extraFields to fail`, () => {
                    evenFormConfigMock.presenterFields.extraFields.forEach(fieldConfig => {
                        fieldConfig['isDisplayed'] = false
                        expect(fieldConfig.isDisplayed).toBeFalsy();
                        expect(currentPresenter.extraValues ||
                            (!currentPresenter.extraValues[fieldConfig.hash] &&
                                (fieldConfig.type !== 'number') || currentPresenter.extraValues[fieldConfig.hash] !== '0') ||
                            fieldConfig.type === 'checkbox' && !currentPresenter.extraValues[fieldConfig.hash].length).toBeTruthy();
                            ErrorArr.push(`missing required field 'presenterData[${p}].extraValues.${fieldConfig.hash}'`);
                    });
                });

                it(`check the type validation on fieldConfig.type case to fail - radio`, () => {
                    evenFormConfigMock.presenterFields.extraFields.forEach(fieldConfig => {
                        let matchingLabel = (fieldConfig as submissionFormModels.CustomMultiSelectFormField).optionLabels.find(label => {
                            return typeof currentPresenter.extraValues[fieldConfig.hash] === 'string' &&
                                currentPresenter.extraValues[fieldConfig.hash].toLowerCase() === label.toLowerCase();
                        });
                        expect(matchingLabel).toBeFalsy();
                        ErrorArr.push(`invalid field 'presenterData[${p}].extraValues.${fieldConfig.hash}'`);
                    });
                });

                it(`check the type validation on fieldConfig.type case to fail - checkbox`, () => {
                    evenFormConfigMock.presenterFields.extraFields.forEach(fieldConfig => {
                        for (let i = 0; i < currentPresenter.extraValues[fieldConfig.hash].length; i++) {
                            let matchingLabel = (fieldConfig as submissionFormModels.CustomMultiSelectFormField).optionLabels.find(label => {
                                return typeof currentPresenter.extraValues[fieldConfig.hash][i] === 'string' &&
                                    currentPresenter.extraValues[fieldConfig.hash][i].toLowerCase() === label.toLowerCase();
                            });
                            expect(matchingLabel).toBeFalsy()
                        };
                        expect(currentPresenter.extraValues[fieldConfig.hash].length === undefined).toBeTruthy();
                        ErrorArr.push(`invalid field 'presenterData[${p}].extraValues.${fieldConfig.hash}'`);
                    });
                });

                it(`check the type validation on fieldConfig.type case to fail - number`, () => {
                    evenFormConfigMock.presenterFields.extraFields.forEach(fieldConfig => {
                        expect(!isNaN(currentPresenter.extraValues[fieldConfig.hash])).toBeTruthy();
                        ErrorArr.push(`invalid field 'presenterData[${p}].extraValues.${fieldConfig.hash}'`);
                    });
                });

                it(`check the type validation on fieldConfig.type case to fail - default`, () => {
                    evenFormConfigMock.presenterFields.extraFields.forEach(fieldConfig => {
                        expect(typeof currentPresenter.extraValues[fieldConfig.hash] !== 'string').toBeTruthy();
                        ErrorArr.push(`invalid field 'presenterData[${p}].extraValues.${fieldConfig.hash}'`);
                    });
                });

            }
            it('check if data has errors', () => {
                expect(ErrorArr.length === 0).toBeFalsy();
            })
        });
    })

    describe('check if presentation data to fail', () => {
        ErrorArr = [];
        it('check if subjects are false', () => {
            let subjectDispaly = evenFormConfigMock.presentationFields.subjects.isDisplayed;
            subjectDispaly = null
            expect(subjectDispaly).toBeFalsy();
            ErrorArr.push(`missing required field 'presentationData.subjects'`);
        });

        it('check if subjects data in presenter data are true, but condition false', () => {
           let testSubjects = presMock.presentationData.subjects
           testSubjects = ['1','2']
            expect(!testSubjects || !testSubjects.length).toBeFalsy();
            expect(!evenFormConfigMock.presentationFields.subjects.isRequired).toBeFalsy();
            ErrorArr.push(`invalid field 'presentationData.subjects'`);
        });

        it('check if all values are valid in subjects to fail', () => {
            evenFormConfigMock.presentationFields.subjects.optionLabels =['','']
            for (let i = 0; i < presMock.presentationData.subjects.length; i++) {
                let matchingSubject = evenFormConfigMock.presentationFields.subjects.optionLabels.find(label => {
                    return typeof presMock.presentationData.subjects[i] === 'string' &&
                        presMock.presentationData.subjects[i].toLowerCase() === label.toLowerCase();
                });
                expect(matchingSubject).toBeFalsy();
                
            };
        });

        it(`check the forEach part for evenFormConfigMock.presenterFields.extraFields`, () => {
            
            evenFormConfigMock.presenterFields.extraFields.forEach(fieldConfig => {
                fieldConfig.isDisplayed = false
                presMock.presentationData.extraValues = null
                expect(fieldConfig.isDisplayed).toBeFalsy();
                expect(!presMock.presentationData.extraValues ||
                    (!presMock.presentationData.extraValues[fieldConfig.hash] &&
                        (fieldConfig.type !== 'number') || presMock.presentationData.extraValues[fieldConfig.hash] !== '0') ||
                    fieldConfig.type === 'checkbox' && !presMock.presentationData.extraValues[fieldConfig.hash].length).toBeTruthy();
                    ErrorArr.push(`missing required field 'presentationData.extraValues.${fieldConfig.hash}'`);
            });
        });

        it(`check the type validation on fieldConfig.type case to fail - radio`, () => {
            evenFormConfigMock.presenterFields.extraFields.forEach(fieldConfig => {
                presMock.presentationData.extraValues = null
                let matchingLabel = (fieldConfig as submissionFormModels.CustomMultiSelectFormField).optionLabels.find(label => {
                    return typeof presMock.presentationData.extraValues[fieldConfig.hash] === 'string' &&
                        presMock.presentationData.extraValues[fieldConfig.hash].toLowerCase() === label.toLowerCase();
                });
                expect(matchingLabel).toBeFalsy();
                ErrorArr.push(`invalid field 'presentationData.extraValues.${fieldConfig.hash}'`);
            });
        });

        it(`check the type validation on fieldConfig.type case to fail - checkbox`, () => {
            evenFormConfigMock.presenterFields.extraFields.forEach(fieldConfig => {
                presMock.presentationData.extraValues = null
                for (let i = 0; i < presMock.presentationData.extraValues[fieldConfig.hash].length; i++) {
                    let matchingLabel = (fieldConfig as submissionFormModels.CustomMultiSelectFormField).optionLabels.find(label => {
                        return typeof presMock.presentationData.extraValues[fieldConfig.hash][i] === 'string' &&
                            presMock.presentationData.extraValues[fieldConfig.hash][i].toLowerCase() === label.toLowerCase();
                    });
                    expect(matchingLabel).toBeFalsy()
                    ErrorArr.push(`invalid field 'presentationData.extraValues.${fieldConfig.hash}'`);
                }
                expect(presMock.presentationData.extraValues[fieldConfig.hash].length === undefined).toBeTruthy();
                ErrorArr.push(`invalid field 'presentationData.extraValues.${fieldConfig.hash}'`);
            })
        });

        it(`check the type validation on fieldConfig.type case to fail - number`, () => {
            evenFormConfigMock.presenterFields.extraFields.forEach(fieldConfig => {
                fieldConfig.hash = '2'
                expect(isNaN(presMock.presentationData.extraValues[fieldConfig.hash])).toBeTruthy();
                ErrorArr.push(`invalid field 'presentationData.extraValues.${fieldConfig.hash}'`);
            });
        });

        it(`check the type validation on fieldConfig.type case to fail - default`, () => {
            evenFormConfigMock.presenterFields.extraFields.forEach(fieldConfig => {
                fieldConfig.hash = null
                expect(typeof presMock.presentationData.extraValues[fieldConfig.hash] !== 'string').toBeTruthy();
                ErrorArr.push(`invalid field 'presentationData.extraValues.${fieldConfig.hash}'`);
            });
        });

        it('check if presentation data has errors', () => {
            expect(ErrorArr.length === 0).toBeFalsy();
        });
    });
});

