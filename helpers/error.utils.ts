import { HttpStatus } from '../constants';
import * as Sentry from '@sentry/node';
import { getClaimsFromResponse } from '../middlewares';

export const handleError = (err, res) => {
    const message = err instanceof HttpException ? err.message : 'Internal Server Error';
    const statusCode = err instanceof HttpException ? err.statusCode : HttpStatus.INTERNAL_SERVER_ERROR;
    const status = err instanceof HttpException ? err.status : 'error';

    const claims = getClaimsFromResponse(res);

    // if user info is present we set it on the error object
    if (claims) {
        Sentry.setUser({ email: claims.email, consumerId: claims.consumerId });
    }

    console.error(err);
    res.status(statusCode).json({
        status,
        statusCode,
        message,
    });
};

export class HttpException extends Error {
    statusCode: number | string;
    status: string;

    constructor(statusCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR, message: string = 'Internal Server Error', status: string = 'error') {
        super();
        this.statusCode = statusCode;
        this.message = message;
        this.status = status;
    }
}

export class NotFoundException extends HttpException {
    constructor(message: string = 'Not Found') {
        super(HttpStatus.NOT_FOUND, message, 'Not Found');
    }
}

export class BadRequestException extends HttpException {
    constructor(message: string = 'Bad Request') {
        super(HttpStatus.BAD_REQUEST, message, 'Bad Request');
    }
}

export class UnauthorizedException extends HttpException {
    constructor(message: string = 'Unauthorized') {
        super(HttpStatus.UNAUTHORIZED, message, 'Unauthorized');
    }
}

export class ForbiddenException extends HttpException {
    constructor(message: string = 'Forbidden') {
        super(HttpStatus.FORBIDDEN, message, 'Forbidden');
    }
}

export class InternalServerErrorException extends HttpException {
    constructor(message: string = 'Internal Server Error') {
        super(HttpStatus.INTERNAL_SERVER_ERROR, message, 'Internal Server Error');
    }
}
