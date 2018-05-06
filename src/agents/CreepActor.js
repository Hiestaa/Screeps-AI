const BaseAgent = require('agents.BaseAgent');
const {
    AT_CREEP_ACTOR
} = require('constants');
const logger = require('log').getLogger('agents.CreepActor', '#8AFF00');

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
        super.initialize(`CreepActor ${creep.name}`, AT_CREEP_ACTOR, {}, {
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
        const res = (key === 'creep') ? Game.creeps[val] : Game.getObjectById(val);
        if (!res) {
            logger.warning(`Unable to find game object ${key}: ${val}`);
        }
        return res;
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

    load(state) { super.load(state); this.creepProfile = state.creepProfile; }

    save(state) { super.save(state); state.creepProfile = this. creepProfile; }

    isAlive() {
        const creep = this.object('creep');
        return (
            creep && creep.hits > 0 && creep.ticksToLive > 0
        );
    }

    notifyNewTask(task) {
        // super.notifyNewTask(task);
        this.object('creep').say(task.shortDescription());
    }

    notifyTaskScheduled(/*task*/) {
        // super.notifyTaskScheduled(task);
        // this.object('creep').say('S:' + task.shortDescription());
    }

    notifyTaskFinished(/*task*/) {
        // super.notifyTaskFinished(task);
        // this.object('creep').say('D:' + task.shortDescription());
    }

    scheduleTask(action) {
        if (action.profiles && !action.profiles.has(this.creepProfile)) {
            logger.warning(
                `Scheduling invalid action ${action.type} (valid profiles: ${action.profiles.join(', ')}) ` +
                `to creep actor ${this.name} of profile: ${this.creepProfile}`);
            debugger;  // eslint-disable-line no-debugger
        }
        super.scheduleTask(action);
    }

    /**
     * Compute the amount of energy this creep is able to harvest based on its
     * body parts.
     * TODO: include body part boosts in the calculation
     * @return {integer} - amount of energy a the creep is expected to be able
     *         to harvest in one tick.
     */
    harvestCapacity() {
        return this.object('creep').body.filter(({type, hits}) => {
            return type === WORK && hits > 0;
        }).length * HARVEST_POWER;
    }

    /**
     * Compute the amount of energy this creep is able to spend to build a
     * structure based on its body parts.
     * TODO: include body part boosts in the calculation
     * @return {integer} - amount of energy a the creep is expected to be able
     *         to spend in one tick.
     */
    buildCapacity() {
        return this.object('creep').body.filter(({type, hits}) => {
            return type === WORK && hits > 0;
        }).length * BUILD_POWER;
    }

    /**
     * Compute the amount of energy this creep is able to carry.
     * @return {integer} - amount of energy a the creep is able to carry.
     */
    carryCapacity() {
        return this.object('creep').carryCapacity;
    }
}


module.exports = CreepActor;
