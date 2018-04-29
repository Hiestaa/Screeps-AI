const BaseCreepAction = require('tasks.creepActions.BaseCreepAction');
const {
    A_HAUL,
    CP_WORKER,
    CP_HAULER
} = require('constants');


/**
 * Haul energy back to the assigned deposit.
 * TODO: Make sure Haulers move out of the way if they have
 * nowhere to deposit energy to....
 * Right now they will just stop in the middle of the way :D
 */
class Haul extends BaseCreepAction {
    /**
     * Create or reload a Haul action.
     * @param {Float} [memory.priority] - priority for this action, used by the agent to control
     *                the execution order of his action.
     *                this MUST be provided when INSTANCIATING or RELOADING the objective.
     * @param {Object} memory.params - parameters for this objective, beware that
                       some objectives might have some required parameters
     * @param {ObjectId} memory.params.targetId - id of the target to which to deposit the resources
     * @param {Object} [memory.state] - the state of this objective, if the objective has
     *                 already been started.
     */
    constructor({priority, params: {targetId}, state}) {
        super(new Set([CP_WORKER, CP_HAULER]), A_HAUL, {
            params: {targetId},
            state,
            priority
        });
    }

    execute(creepActor) {
        super.execute(creepActor);
        const creep = creepActor.object('creep');
        const target = Game.getObjectById(this.params.targetId);
        if(creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
            creep.moveTo(target, {visualizePathStyle: {stroke: '#FFEA00'}});
        }
    }

    /**
     * A creep is finished upgrading when it is empty.
     * @param {CreepActor} creepActor - creep actor executing the action
     */
    finished(creepActor) {
        return creepActor.object('creep').carry.energy == 0;
    }

    shortDescription() {
        return '👜';
    }
}

module.exports = Haul;
