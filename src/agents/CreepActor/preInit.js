
const {
    AT_CREEP_ACTOR
} = require('constants');

const creepActorSave = require('agents.CreepActor.save');
const baseAgentInitialize = require('agents.BaseAgent.initialize');

/**
 * Pre-initialize a creep actor for a given creep profile, to use when spawning a new creep.
 * This enables to create and save the memory of the creep actor before the
 * creep actually get spawned, so that it get spawned with the appropriate memory.
 * Beware that the creep actor will not be in a working state after preinit, as
 * no creep game object will be attached to the agent. Use `initialize` to use
 * the agent right away.
 * @param {CONST} creepProfile - the profile of this creep, which determines
 *                which tasks will be available for this creep to perform.
 *                This should be one of the `CP_*` constants.
 */
module.exports = function(creepProfile) {
    const agentPreInit = {
        creepProfile: creepProfile.name
    };
    baseAgentInitialize(agentPreInit, `CreepActor ${creepProfile.getCreepName()}`, AT_CREEP_ACTOR, {}, {
        // the `findGameObject()` method won't be able to find any creep here
        creep: creepProfile.getCreepName()
    }, {noWarn: true});
    const memory = {};
    creepActorSave(agentPreInit, memory);
    return memory;
};
