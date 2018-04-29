const BaseTask = require('tasks.BaseTask');
const {
    AT_CREEP_ACTOR
} = require('constants');

/**
 * Creep actions are tasks designed to be executed by creeps specifically.
 * They add to tasks requirements for a specific creep profile, to be
 * used when dispatching the tasks appropriately.
 * In the first version creeps will get tasks assigned to them specifically.
 * In the future we could imagine a smart dispatcher among the creeps of a
 * group, room, or colony that will reassign tasks in a more efficient
 * manner e.g. when a creep on one side of the room is tasked to
 * repair a wall at the other side of the room but another creep
 * currently is repairing a wall nearby and would be more appropriate
 * to handle the task.
 */

class BaseCreepAction extends BaseTask {
    /**
     * Initialize the creep action, the task will have the AT_CREEP_ACTOR
     * applicable agent type
     * BaseCreepAction is an interface and should not be instanciated directly
     * @param {Set<CONST>} profiles - set of accepted creep profiles
     *                    This MUST be DEFINED by a sub-class
     * @param {CONST} type - type of this objective (O_*, A_* or T_* constant)
     *                This MUST be DEFINED by a sub-class
     * @param {Object} memory - stored memory, or provided bootstrap memory
     *                 this MUST be provided when INSTANCIATING or RELOADING the objective.
     * @param {Float} [memory.priority] - priority for this action, used by the agent to control
     *                the execution order of his action.
     * @param {Object} [memory.params] - parameters for this objective, beware that
                       some objectives might have some required parameters
     * @param {Object} [memory.state] - the state of this objective, if the objective has
     *                 already been started.
     */
    constructor(profiles, type, memory) {
        super(type, AT_CREEP_ACTOR, memory);

        this.profiles = profiles;
    }

    /**
     * Ensures appropriate creep profile. Call if overriding.
     * @param {CreepActor} creepActor - creep actor executing the action
     */
    execute(creepActor) {
        if (!this.profiles.has(creepActor.creepProfile)) {
            throw new Error(
                `Invalid creep profile for action: ${this.type}, ` +
                `agent: ${creepActor.creepProfile}`);
        }
    }
}

module.exports = BaseCreepAction;