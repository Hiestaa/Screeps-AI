const BaseProfile = require('creepsProfiles.BaseProfile');
const {
    CP_RANGED_FIGHTER
} = require('constants');

/**
 * Profile dedicated to fight from a distance
 */
class RangedFighterProfile extends BaseProfile {
    /**
     * Initialize the worker profile.
     * @param {Object} [upgrades] - upgrades to apply to this proile
     */
    constructor(upgrades) {
        super(CP_RANGED_FIGHTER, RANGED_ATTACK, [ RANGED_ATTACK ], upgrades);
    }
}

module.exports = RangedFighterProfile;
