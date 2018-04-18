const BaseCreepAction = require('actions.BaseCreepAction');
const {
    A_HARVEST,
    CP_WORKER
} = require('constants');

/**
 * The harvest action proceeds as follow:
 * Move towards the assigned source until reach, then harvest until
 * max carry capacity.
 * IDEA: split the move part from the harvest part, to more easily
 * re-route the creeps as necessary
 */
class Harvest extends BaseCreepAction {
    /**
     * Create or reload a Harvest action.
     * @param {Float} [memory.priority] - priority for this action, used by the agent to control
     *                the execution order of his action.
     *                this MUST be provided when INSTANCIATING or RELOADING the objective.
     * @param {Object} memory.params - parameters for this objective, beware that
                       some objectives might have some required parameters
     * @param {ObjectId} memory.params.sourceId - id of the source from which to harvest.
     * @param {Object} [memory.state] - the state of this objective, if the objective has
     *                 already been started.
     */
    constructor({params: {sourceId}, state}) {
        super(new Set([CP_WORKER]), A_HARVEST, {
            params: {sourceId},
            state,
            priority
        });
    }

    execute(creepActor) {
        super(creepActor);
        const creep = creepActor.attachedGameObjects.creep;
        if(creep.carry.energy < creep.carryCapacity) {
            var source = Game.getObjectById(this.params.sourceId);
            if(creep.harvest(source) == ERR_NOT_IN_RANGE) {
                creep.moveTo(source, {visualizePathStyle: {stroke: '#ffaa00'}});
            }
        }
        else {
            console.log('[ERROR][HARVEST] Creep is Full. Task is should be finished.');
        }
    }

    /**
     * A creep is full when the next harvest action would be wasteful.
     * @param {CreepActor} creepActor - creep actor executing the action
     */
    finished(creepActor) {
        return creep.carry.energy > creep.carryCapacity - 2;
    }

}