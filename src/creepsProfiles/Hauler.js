const BaseProfile = require('creepsProfiles.BaseProfile');
const {
    CP_HAULER
} = require('constants');

/**
 * Profile dedicated to hauling - it only includes CARRY body parts
 */
class HaulerProfile extends BaseProfile {
    /**
     * Initialize the worker profile.
     * @param {Object} [upgrades] - upgrades to apply to this proile
     */
    constructor(upgrades) {
        super(CP_HAULER, CARRY, [ CARRY ], upgrades);
    }
}

module.exports = HaulerProfile;
