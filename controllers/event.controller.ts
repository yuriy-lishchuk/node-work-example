import * as sharedQueries from "../shared-queries";
import * as createError from 'http-errors';

// archive Event
const archiveEvent =  async function (req, res, next) {
  const { eventCode } = req.params;

  try {
    // check if event available
    const count = await sharedQueries.isEventExist({
      condition: `eventCode = '${eventCode}'`
    });

    if (count === 0) {
      throw createError(400, `Event ${ eventCode } unavailable or are not exist`);
    }

    await sharedQueries.archive({ eventCode });
  } catch (err) {
    console.log(err);
    console.log('Error while archiving event: ' + eventCode);
    return res.status(err.status || 500).json({ message: err.message });
  }

  return res.json({ message: 'success' } );
};

// unarchive Event
const unarchiveEvent =  async function (req, res, next) {
  const { eventCode } = req.params;

  try {
    // check if event available
    const count = await sharedQueries.isEventExist({
      condition: `eventCode = '${eventCode}'`
    });

    if (count === 0) {
      throw createError(400, `Event ${ eventCode } unavailable or are not exist`);
    }

    await sharedQueries.unarchive({ eventCode });
  } catch (err) {
    console.log(err);
    console.log('Error while unarchiving event: ' + eventCode);
    return res.status(err.status || 500).json({ message: err.message });
  }

  return res.json({ message: 'success' } );
};

export {
  archiveEvent,
  unarchiveEvent,
}
