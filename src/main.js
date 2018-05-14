require('cli');
const run = require('agents.AgentsManager.run');
const logger = require('log').getLogger('main', 'white');

const {
    SCRIPT_VERSION
} = require('version');
if(!Memory.SCRIPT_VERSION || Memory.SCRIPT_VERSION != SCRIPT_VERSION) {
    Memory.SCRIPT_VERSION = SCRIPT_VERSION;
    logger.info('New code uploaded');
}

module.exports.loop = function () {
    logger.debug('--------------------------------------------------------------');
    logger.debug('[MAIN] Tick begins.');
    try {
        run();
    }
    catch (e) {
        logger.fatal(`Interrupted tick: ${e.message}\n${e.stack}`);
        debugger;  // eslint-disable-line no-debugger
        throw e;
    }
    logger.debug('[MAIN] Tick ends.');
    logger.debug('^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^');
};
