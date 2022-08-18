const Joi = require('@hapi/joi');
const passwordComplexity = require('joi-password-complexity');

export const passwordComplexitySchema = passwordComplexity({
    lowerCase: 1,
    upperCase: 1,
    numeric: 1,
    requirementCount: 6,
    min: 6,
    symbol: 0,
    max: 30,
});

export const emailSchema = Joi.string()
    .email({
        minDomainSegments: 2,
    })
    .required();

const eventEmailSchema = Joi.object({
    eventId: Joi.number(),
    emails: Joi.array().items(emailSchema).required(),
}).options({ stripUnknown: true })

export const createEventDtoSchema = Joi.object({
    eventName: Joi.string()
                .required(),
    organizedBy: Joi.string()
                .required(),
    eventCode: Joi.string()
                .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
                .required(),
    eventLaunchDate: Joi.string()
                        .required(),
    subscriptionId: Joi.number()
                        .required()
});

export const validateEventEmails = (input) => eventEmailSchema.validate(input)

export const institutionSchema = Joi.object({
    name: Joi.string().required(),
})
