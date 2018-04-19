const BaseProfile = require('creepsProfiles.BaseProfile');
const {
    CP_WORKER,
    CP_SLOW
} = require('constants');

/**
 * Profile dedicated to work-related operations.
 */
class WorkerProfile extends BaseProfile {
    /**
     * Initialize the worker profile.
     * @param {Integer} toughness - number of TOUGH body parts
     * @param {Integer} efficiency - number of WORK body parts
     * @param {CONST} toughness - speed level
     */
    constructor(toughness, efficiency, speed) {
        super(CP_WORKER, WORK, [
            WORK, CARRY
        ], toughness || 0, efficiency || 0, speed || CP_SLOW);
    }
}

module.exports = WorkerProfile;