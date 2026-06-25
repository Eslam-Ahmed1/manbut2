/**
 * Simple logger that respects NODE_ENV.
 *
 * - production  → info + error only (debug/verbose are silenced)
 * - development → everything
 *
 * Usage:
 *   import logger from '../../utils/logger.js';
 *   logger.info('Server started');
 *   logger.debug('Verbose scan step…');   // silent in prod
 *   logger.error('Something broke', err);
 */

const isProd = process.env.NODE_ENV === 'production';

const timestamp = () => new Date().toISOString();

const logger = {
    /** Always logged — use for request lifecycle & critical events */
    info: (...args: unknown[]) => {
        console.log(`[${timestamp()}]`, ...args);
    },

    /** Only logged outside production — use for step-by-step debug traces */
    debug: (...args: unknown[]) => {
        if (!isProd) console.log(`[${timestamp()}] [debug]`, ...args);
    },

    /** Always logged */
    error: (...args: unknown[]) => {
        console.error(`[${timestamp()}] [error]`, ...args);
    },

    /** Always logged */
    warn: (...args: unknown[]) => {
        console.warn(`[${timestamp()}] [warn]`, ...args);
    },
};

export default logger;
