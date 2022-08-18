import 'reflect-metadata';
import { createConnection } from 'typeorm';
import { getConsumersRepository, getEventsRepository, getPreApprovedEmailsRepository } from './repositories';

const result = require('dotenv').config();

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var authenticationRouter = require('./routes/authentication');
var usersRouter = require('./routes/users');
var liveSessionsRouter = require('./routes/liveSessions');
var pricingRouter = require('./routes/pricing');
var presentationsRouter = require('./routes/presentations');
var alternativePresentationsRouter = require('./routes/alternative-presentations');
var eventsRouter = require('./routes/events');
import * as subscriptions from './routes/subscriptions'
import { handleError, NotFoundException } from './helpers';
const Sentry = require('@sentry/node');
import featureFlagsRouter from './routes/feature-flags'

import paymentsRouter from './routes/payments'
import stripeRouter from './routes/stripe'
import institutionsRouter from './routes/institution'

// root directory
export const appRootDir = __dirname;

var app = express();
const debug = require('debug')('server:server');
const error = require('debug')('server:error');

app.use('/api/stripe', stripeRouter);


createConnection()
    .then(() => debug(`connected to database ${process.env.DB_USER}@${process.env.DB_HOST}`))
    .catch((e)=> {
        error(`error connecting to database`);
        console.error(e)
    })

if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'beta') {
    Sentry.init({
        environment: process.env.NODE_ENV + '-server',
        dsn: "https://6c1ad59fc2e140d897915afb74397815@o465912.ingest.sentry.io/5479463"
    });

    // The request handler must be the first middleware on the app
    app.use(Sentry.Handlers.requestHandler());
}


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', indexRouter);
app.use('/api/authentication', authenticationRouter);
app.use('/api/users', usersRouter);
app.use('/users', usersRouter);
app.use('/api/live-sessions', liveSessionsRouter);
app.use('/api/presentations', presentationsRouter);
app.use('/api/pricing', pricingRouter);
app.use('/api/subscriptions', subscriptions);
app.use('/api/alternative-presentations', alternativePresentationsRouter);
app.use('/api/events', eventsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/feature-flags', featureFlagsRouter);
app.use('/api/v2/institutions', institutionsRouter);

// Health Check
app.get('/health', function(req, res, next) {
    res.status(200).json({ msg: 'OK' }).end();
});

// The error handler must be before any other error middleware and after all controllers
if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'beta') {
    app.use(Sentry.Handlers.errorHandler());
}

// catch 404 and forward to error handler
app.use((req, res, next) => {
    next(new NotFoundException('Page not found'));
});

app.use((err, req, res, next) => {
    handleError(err, res);
});


module.exports = app;
