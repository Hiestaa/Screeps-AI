const run = require('agents.AgentsManager.run');

require('version');
if(!Memory.SCRIPT_VERSION || Memory.SCRIPT_VERSION != SCRIPT_VERSION) {
    Memory.SCRIPT_VERSION = SCRIPT_VERSION
    console.log('New code uplodated')
}

module.exports.loop = function () {
    run();
};
