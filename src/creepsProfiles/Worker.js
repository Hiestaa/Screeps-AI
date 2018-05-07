const BaseProfile = require('creepsProfiles.BaseProfile');
const {
    CP_WORKER
} = require('constants');

/**
 * Profile dedicated to work-related operations.
 */
class WorkerProfile extends BaseProfile {
    /**
     * Initialize the worker profile.
     * @param {Object} [upgrades] - upgrades to apply to this proile
     */
    constructor(upgrades) {
        super(CP_WORKER, WORK, [ WORK, CARRY ], upgrades);
    }
}

module.exports = WorkerProfile;
