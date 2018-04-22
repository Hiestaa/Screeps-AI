/**
 * Define a bunch of utility function to ease stuff such as restarting from scratch
 */

const {clearStorage} = require('agents.AgentsManager.storage');
const {suspend, resume} = require('agents.AgentsManager.run');
const {
    enableLogger,
    disableLogger,
    enableLevel,
    disableLevel,
    listLoggers
} = require('log');

global.cli = global.cli || {};

global.cli.clear = () => {
    clearStorage();
    return 'OK.';
};

global.cli.clearAndSuspend = () => {
    clearStorage();
    suspend();
    return 'OK.';
};

global.cli.resume = () => {
    resume();
    return 'OK.';
};

global.cli.log = {};
global.cli.log.enableLogger = (scope, color) => {
    enableLogger(scope, color);
};

global.cli.log.disableLogger = (scope) => {
    disableLogger(scope);
};

global.cli.log.enableLevel = (level) => {
    enableLevel(level);
};

global.cli.log.disableLevel = (level) => {
    disableLevel(level);
};

global.cli.log.list = () => {
    listLoggers();
};
