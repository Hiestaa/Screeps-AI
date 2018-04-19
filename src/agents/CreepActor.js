const BaseAgent = require('agents.BaseAgent');
const {
    AT_CREEP_AGENT
} = require('constants');

/**
 * The creep actor is created to control the behavior of a creep.
 * It does not manage any agent itself.
 */
class CreepActor extends BaseAgent {
    constructor(id) {
        super(id);
        this.creepProfile = null;
    }

    /**
     * Initialize the creep actor to a working state
     *
     * @param {Creep} creep - the creep this actor is attached to
     * @param {CONST} creepProfile - the profile of this creep, which determines
     *                which tasks will be available for this creep to perform.
     *                This should be one of the `CP_*` constants.
     */
    initialize(creep, creepProfile) {
        this.creepProfile = creepProfile;
        super(`CreepActor ${creep.name}`, AT_CREEP_AGENT, {}, {
            creep: creep.name
        });
    }

    // TODO: add creep spawning capability
    // creep spawning should happen by first creating a creep actor with an id
    // that matches a unique creep name (can be added in the constructor of this object),
    // then asking the creep actor to spawn the creep with this unique name.  The link between actor and
    // creep will not be effective during this tick because the creep won't
    // actually exist until the end of the tick.
    // However the unique name used as id will enable the agent to load
    // the creep object off of `Game.creeps[name]` instead of `Game.getObjectById()`
    findGameObject(key, val) {
        if (key === 'creep') { return Game.creeps[val]; }
        return Game.getObjectById(val);
    }
    /**
     * The state of the creep actor agent is stored in the
     * `Memory.creeps[creepName]` object, which should be a alias for
     * `Game.creeps[creepName].memory`. The idea is both:
     * * To ease inspection of this agent state via in-game shortcuts
     * * To link a creep actor to its creep object upon spawning of the creep.
     *   When spawning a creep, the creep is only created at the next tick.
     *   To create the agent in the same task and start giving it a task to be
     *   exected at the next tick, the initialization of the agent is performed
     *   by providing the creep name instead of the creep object which is then
     *   saved instead of the id, such that at the next tick when reloading the
     *   agent `findgameObject()` will be able to find the proper creep object
     *   that should have been successfully created.
     */
    memoryLocation() {
        return `creeps.${this.attachedGameObjectIds.creep}`;
    }

    load(state) { super(state); this.creepProfile = state.creepProfile; }

    save(state) { super(state); state.creepProfile = this. creepProfile; }

    isAlive() {
        return (
            this.attachedGameObjects.creep &&
            this.attachedGameObjects.creep.hits > 0 &&
            this.attachedGameObjects.creep.ticksToLive > 0
        );
    }

}


module.exports = CreepActor;
