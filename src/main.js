require('cli');
const run = require('agents.AgentsManager.run');

const {
    SCRIPT_VERSION
} = require('version');
if(!Memory.SCRIPT_VERSION || Memory.SCRIPT_VERSION != SCRIPT_VERSION) {
    Memory.SCRIPT_VERSION = SCRIPT_VERSION;
    console.log('New code uplodated');
}

module.exports.loop = function () {
    console.log('--------------------------------------------------------------');
    console.log('[MAIN] Tick begins.');
    run();
    console.log('[MAIN] Tick ends.');
    console.log('^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^');
};
