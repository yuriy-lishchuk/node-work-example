import { LiveSession, Event } from '../models';

import * as express from 'express';
const router = express.Router();
import * as cors from 'cors';
router.use(cors());

import * as sharedQueries from '../shared-queries';

import {
    checkIsAuthenticated,
    checkLiveSessionAgainstRegisteredEvents,
    checkIsEventAdmin,
} from '../authentication-middleware';
import { isUserBlockedFromSession } from '../middlewares';
import * as authQueries from '../auth-queries';

// Authorization:
// User rejected, if university not launched yet (middleware)
// User must be logged in
// User must be admin
router.post(
    '/',
    checkIsAuthenticated,
    checkIsEventAdmin,
    // TODO: Pop this back in
    // checkSubscriptionLimits(SubscriptionLimitType.LIVE_SESSIONS),
    async function (req, res, next) {
        // -- title
        if (!req.body.title) {
            res.status(400).json({ message: "missing required field 'title'" });
            return;
        }
        // -- sessionStart
        if (!req.body.sessionStart) {
            res.status(400).json({ message: "missing required field 'sessionStart'" });
            return;
        }
        if (isNaN(Date.parse(req.body.sessionStart))) {
            res.status(400).json({ message: "invalid field 'sessionStart'" });
            return;
        }
        // -- sessionEnd
        if (req.body.sessionEnd && isNaN(Date.parse(req.body.sessionEnd))) {
            res.status(400).json({ message: "invalid field 'sessionEnd'" });
            return;
        }
        // -- link
        if (!req.body.presentationLink) {
            res.status(400).json({
                message: "missing required field 'presentationLink'",
            });
            return;
        }
        try {
            new URL(req.body.presentationLink.trim());
            if (
                !req.body.presentationLink
                    .trim()
                    .toLowerCase()
                    .match(/^(http|https):\/\/[a-z]+/)
            ) {
                throw Error();
            }
        } catch (_) {
            res.status(400).json({ message: "invalid field 'presentationLink'" });
            return;
        }

        // -- description
        if (!req.body.description) {
            res.status(400).json({ message: "missing required field 'description'" });
            return;
        }

        // -- request is VALID --

        //create liveSession
        try {
            await sharedQueries.insertLiveSession({
                eventId: req.body.eventId || req.query.eventId,
                sessionLinkType: 'link',
                link: req.body.presentationLink.trim(),
                title: req.body.title,
                sessionStart: new Date(req.body.sessionStart),
                sessionEnd: req.body.sessionEnd ? new Date(req.body.sessionEnd) : null,
                description: req.body.description,
            });
        } catch (err) {
            console.log(err);
            next(err);
        }

        //success
        res.json({ message: 'success' });
    }
);

// Authorization:
// User rejected, if university not launched yet (middleware)
// User must be associated with the liveSessions by event
router.get(
    '/',
    checkLiveSessionAgainstRegisteredEvents,
    isUserBlockedFromSession,
    async function (req, res, next) {
        const { eventCodeOrHash } = req.query;
        try {
            const event: Event = await authQueries.getOneEventByHashCodeOrID(
                eventCodeOrHash as string
            );
            const sessions: LiveSession[] = await sharedQueries.getLiveSessionId(
                event.eventId
            );
            res.json(sessions);
        } catch (err) {
            console.log(err);
            next(err);
        }
    }
);

// Authorization:
// User rejected, if university not launched yet (middleware)
// User must be logged in
// User must be admin
// LiveSession must exist under admin's institutionId (from JWT)
router.put('/:liveSessionId', checkIsAuthenticated, checkIsEventAdmin, async function (
    req,
    res,
    next
) {
    // -- validate request --

    // -- liveSessionId (request route param)
    if (isNaN(+req.params.liveSessionId)) {
        res.status(400).json({ message: 'invalid liveSessionId' });
        return;
    }

    let editedFields = 0;

    // -- title
    if (req.body.title) {
        if (req.body.title.length === 0) {
            res.status(400).json({ message: "invalid field 'title'" });
            return;
        }

        editedFields++;
    }
    // -- sessionStart
    if (req.body.sessionStart) {
        if (isNaN(Date.parse(req.body.sessionStart))) {
            res.status(400).json({ message: "invalid field 'sessionStart'" });
            return;
        }

        editedFields++;
    }
    // -- sessionEnd
    if (req.body.sessionEnd !== undefined && req.body.sessionEnd !== null) {
        if (isNaN(Date.parse(req.body.sessionEnd))) {
            res.status(400).json({ message: "invalid field 'sessionEnd'" });
            return;
        }

        editedFields++;
    }
    // -- link
    if (req.body.presentationLink) {
        try {
            new URL(req.body.presentationLink.trim());
            if (
                !req.body.presentationLink
                    .trim()
                    .toLowerCase()
                    .match(/^(http|https):\/\/[a-z\d]+/)
            ) {
                throw Error();
            }
        } catch (_) {
            res.status(400).json({ message: "invalid field 'presentationLink'" });
            return;
        }

        editedFields++;
    }

    // -- description
    if (req.body.description) {
        if (req.body.description.length === 0) {
            res.status(400).json({ message: "invalid field 'description'" });
            return;
        }

        editedFields++;
    }

    // -- liveSessionId (request route param)
    if (isNaN(+req.params.liveSessionId)) {
        res.status(400).json({ message: 'invalid liveSessionId' });
        return;
    }
    //ensure given liveSession exists with given event
    const dbResponse = await sharedQueries.getLiveSessionByIdAndEventId(
        +req.params.liveSessionId,
        req.body.eventId
    );
    if (!dbResponse) {
        res.status(404).json({ message: 'liveSession not found' });
        return;
    }

    //ensure at least 1 field is being edited
    if (editedFields === 0) {
        res.status(400).json({ message: 'no fields provided' });
        return;
    }

    // -- request is VALID --

    const queryObject = {
        eventId: req.body.eventId || req.query.eventId,
        liveSessionId: req.params.liveSessionId,
        sessionLinkType: 'link',
    };
    if (req.body.presentationLink) {
        queryObject['link'] = req.body.presentationLink.trim();
    }
    if (req.body.title) {
        queryObject['title'] = req.body.title;
    }
    if (req.body.sessionStart) {
        queryObject['sessionStart'] = new Date(req.body.sessionStart);
    }
    if (req.body.sessionEnd !== undefined) {
        if (req.body.sessionEnd === null) {
            queryObject['sessionEnd'] = null;
        } else {
            queryObject['sessionEnd'] = new Date(req.body.sessionEnd);
        }
    }
    if (req.body.description) {
        queryObject['description'] = req.body.description;
    }

    //update liveSession
    let result;
    try {
        result = await sharedQueries.updateLiveSession(queryObject);
    } catch (err) {
        console.log(err);
        console.log('Error while performing Query.');
        res.status(500).json({ message: 'unknown error' });
        return;
    }

    //success
    res.json({ message: 'success' });
});

// Authorization:
// User rejected, if university not launched yet (middleware)
// User must be logged in
// User must be admin
router.delete('/:liveSessionId', checkIsAuthenticated, checkIsEventAdmin, async function (
    req,
    res,
    next
) {
    // -- validate request --

    // -- liveSessionId (request route param)
    if (isNaN(+req.params.liveSessionId)) {
        res.status(400).json({ message: 'invalid liveSessionId' });
        return;
    }
    //ensure given liveSession exists with given event
    const dbResponse = await sharedQueries.getLiveSessionByIdAndEventId(
        +req.params.liveSessionId,
        +req.query.eventId
    );
    if (!dbResponse) {
        res.status(404).json({ message: 'live-session not found' });
        return;
    }

    // -- request is VALID --

    //delete liveSession
    try {
        await sharedQueries.deleteLiveSession(+req.params.liveSessionId);
    } catch (err) {
        console.log(err);
        console.log('Error while performing Query.');
        res.status(500).json({ message: 'unknown error' });
        return;
    }

    //success
    res.json({ message: 'success' });
});

router.put('/:eventCode/order', checkIsAuthenticated, checkIsEventAdmin, async function (
    req,
    res,
    next
) {
    const { eventCode } = req.params;
    const event: Event = await authQueries.getOneEventByHashCodeOrID(eventCode as string);

    const { liveSessionIds } = req.body;
    if (liveSessionIds.some((id) => typeof id !== 'number')) {
        res.status(400).json({ message: 'invalid liveSessionIds' });
        return;
    }

    try {
        await sharedQueries.updateLiveSessionsOrderByEventId(
            event.eventId,
            liveSessionIds
        );
    } catch (err) {
        console.log(err);
        console.log('Error while performing Query.');
        res.status(500).json({ message: 'unknown error' });
        return;
    }

    res.json({ message: 'success' });
});

module.exports = router;
