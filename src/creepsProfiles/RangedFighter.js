const BaseProfile = require('creepsProfiles.BaseProfile');
const {
    CP_RANGED_FIGHTER,
    CP_SLOW
} = require('constants');

/**
 * Profile dedicated to fight from a distance
 */
class RangedFighterProfile extends BaseProfile {
    /**
     * Initialize the worker profile.
     * @param {Integer} toughness - number of TOUGH body parts
     * @param {Integer} efficiency - number of WORK body parts
     * @param {CONST} toughness - speed level
     */
    constructor(toughness, efficiency, speed) {
        super(CP_RANGED_FIGHTER, RANGED_ATTACK, [
            RANGED_ATTACK
        ], toughness || 0, efficiency || 0, speed || CP_SLOW);
    }
}

module.exports = RangedFighterProfile;
