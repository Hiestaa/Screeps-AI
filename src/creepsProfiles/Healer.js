const BaseProfile = require('creepsProfiles.BaseProfile');
const {
    CP_HEALER
} = require('constants');

/**
 * Profile dedicated to healing in a group of fighters
 */
class HealerProfile extends BaseProfile {
    /**
     * Initialize the worker profile.
     * @param {Object} [upgrades] - upgrades to apply to this proile
     */
    constructor(upgrades) {
        super(CP_HEALER, HEAL, [ HEAL ], upgrades);
    }
}

module.exports = HealerProfile;
