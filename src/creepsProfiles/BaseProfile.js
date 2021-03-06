const {
    CPS_SLOW,
    CPS_CONST,
    CPS_FAST,
    CPS_SWIFT
} = require('constants');
const counter = require('creepsProfiles.counter');

/**
 * Base class for all creep profiles
 * Creep profiles are not a role in the sense that they don't define a behavior.
 * They have a declarative nature that only describes what the creep is capable of doing,
 * depending on its body parts.
 */
class BaseProfile {
    /**
     * Initialize the creep profile for a specific function.
     * The function is highly specific to the body parts defined. However,
     * some body parts depend on others, and some have non-linear usefulness.
     * The parameters allow to precisely tune the type of profile this represent.
     * @param {CONST} name of the profile
     * @param {CONST} mainBodyPart - the body part that defines the main function of this creep.
     *                this is the body part that will be multiplied by the efficiency level.
     * @param {Array<CONST>} baseBodyParts - the list of base, fixed body part that need to be
     *                present for this creep profile to execute its tasks at the lowest efficiency
     *                possible. This will determine the min cost of this creep profile.
     * @param {Object} [upgrade] - upgrades to apply to this creep profile
     * @param {Integer} [upgrades.toughness=0] - the toughness level (number of TOUGH body parts to add)
     * @param {Integer} [upgrades.efficiency=0] - efficiency level (number of mainBodyPart to add)
     * @param {CONST} [upgrades.speed=0] - speed level of this creep
     *                /!\ `(baseBodyParts.length + toughness + efficiency) * (speedFactor + 1) < 50` /!\
     */
    constructor(name, mainBodyPart, baseBodyParts, {toughness, efficiency, speed}={}) {
        const bodyParts = [];
        toughness = toughness || 0;
        efficiency = efficiency || 0;
        speed = speed || CPS_SLOW;
        // first push the toughness related body parts, because these will take hit first
        for (let i = 0; i < toughness; i++) {
            bodyParts.push(TOUGH);
        }
        // then push the efficiency, protected by the toughness
        for (let i = 0; i < efficiency; i++) {
            bodyParts.push(mainBodyPart);
        }

        bodyParts.push(MOVE);

        if (speed !== CPS_SLOW) {
            // then add the move parts, so the creep keeps a chance to escape when all hope is lost
            const factor = {[CPS_CONST]: 0.5, [CPS_FAST]: 1, [CPS_SWIFT]: 5}[speed];
            for (var i = 0; i < (efficiency + toughness + baseBodyParts.length - 1) * factor; i++) {
                bodyParts.push(MOVE);
            }
        }

        // then add the base body parts, last to be affected
        for (let i = 0; i < baseBodyParts.length; i++) {
            bodyParts.push(baseBodyParts[i]);
        }

        this.bodyParts = bodyParts;
        this.cost =  _.sum(bodyParts.map(p => BODYPART_COST[p]));
        this.name = name;
        this.fullName = null;  // only generated if `getCreepName()` is called
        this.toughness = toughness;
        this.efficiency = efficiency;
        this.mainBodyPart = mainBodyPart;
        this.speed = speed;
    }

    /**
     * Generates a unique name for this creep
     * @return {string} - the (same) unique name generated for this instance on each call
     */
    getCreepName() {
        if (this.fullName !== null) { return this.fullName; }
        this.fullName = `${this.name}#${counter(this.name)}`;
        return this.fullName;
    }
}

module.exports = BaseProfile;
