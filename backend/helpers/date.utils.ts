import { parseISO } from 'date-fns';

/**
 *  Parses MysQL date into a JS date
 * @param { string | Date }  date - A string or Date param.
 * @return { Date } Parsed JS Date
 */
export const parseDate = (date: string | Date): Date => {
    return typeof date === 'string' ? parseISO(date) : date;
};

export const currentDateSQLFormat = (): string => {
    const timeNow = new Date();
    return timeNow.toISOString().substring(0, timeNow.toISOString().indexOf('.'));
};
