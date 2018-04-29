const BaseProfile = require('creepsProfiles.BaseProfile');
const {
    CP_HEALER,
    CP_SLOW
} = require('constants');

/**
 * Profile dedicated to healing in a group of fighters
 */
class HealerProfile extends BaseProfile {
    /**
     * Initialize the worker profile.
     * @param {Integer} toughness - number of TOUGH body parts
     * @param {Integer} efficiency - number of WORK body parts
     * @param {CONST} toughness - speed level
     */
    constructor(toughness, efficiency, speed) {
        super(CP_HEALER, HEAL, [
            HEAL
        ], toughness || 0, efficiency || 0, speed || CP_SLOW);
    }
}

module.exports = HealerProfile;
