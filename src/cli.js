/**
 * Define a bunch of utility function to ease stuff such as restarting from scratch
 */

const {clearStorage} = require('agents.AgentsManager.storage');
const {suspend, resume} = require('agents.AgentsManager.run');

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
