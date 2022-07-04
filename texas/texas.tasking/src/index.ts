import { Tasker } from './Tasker';
import { TrackReceiver } from './TrackReceiver';

import { getLogger } from 'log4js';

/**
 * Main entry point for the application.
 */

// Create a logger.
const logger = getLogger();
logger.level = 'debug';
logger.debug('Starting');

// Start the tasker.
// @ts-ignore
const tasker = new Tasker(new TrackReceiver(logger), logger);
