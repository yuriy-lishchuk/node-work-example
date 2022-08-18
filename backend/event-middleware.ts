import * as sharedQueries from './shared-queries';

export const accessCustomSubmissionFormEditorIsAllowed = async (req, res, next) => {
  // ensure given presentation exists with given event
  let dbEvent: any;
  try {
    dbEvent = await sharedQueries.getEventByCode(req.params.eventCode);
  } catch (err) {
    console.log('Error while performing Query.', err);
    return res.status(500).json({ message: "unknown error" });
  }
  if (!dbEvent?.eventId) {
    return res.status(404).json({ message: "presentation not found" });
  }

  // validate request type
  if (!req.headers['content-type'].startsWith('multipart/form-data')) {
    return res.status(400).json({ msg: "invalid form type" });
  }
  
  return next();
};

