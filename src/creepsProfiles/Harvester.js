const BaseProfile = require('creepsProfiles.BaseProfile');
const {
    CP_HARVESTER
} = require('constants');

/**
 * Profile dedicated to harvest from a dedicated mining spot
 * It does not include any carry part - any energy harvested will be
 * automatically dropped on the floor.
 */
class HarvesterProfile extends BaseProfile {
    /**
     * Initialize the worker profile.
     * @param {Object} [upgrades] - upgrades to apply to this proile
     */
    constructor(upgrades) {
        super(CP_HARVESTER, WORK, [ WORK ], upgrades);
    }
}

module.exports = HarvesterProfile;
