const BaseCreepAction = require('tasks.creepActions.BaseCreepAction');
const {
    A_HARVEST,
    CP_WORKER,
    CP_HARVESTER
} = require('constants');
const logger = require('log').getLogger('tasks.creepActions.Harvest', '#FEBF00');

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
    constructor({priority, params: {sourceId}, state}) {
        super(new Set([CP_WORKER, CP_HARVESTER]), A_HARVEST, {
            params: {sourceId},
            state,
            priority
        });
        this.amountHarvested = 0;
    }

    execute(creepActor) {
        super.execute(creepActor);
        const creep = creepActor.attachedGameObjects.creep;
        if (creep.carry.energy === creep.energyCapacity) { return; }
        var source = Game.getObjectById(this.params.sourceId);
        const code = creep.harvest(source);
        if(code === ERR_NOT_IN_RANGE) {
            creep.moveTo(source, {visualizePathStyle: {stroke: '#ffaa00'}});
        }
        else if (code !== OK) {
            logger.failure(code, 'Couldn\'t harvest energy from source ' + source.id.slice(0, 3));
            this.state.failure = true;
        }
        else {
            // TODO: don't assume the source is going to be full
            this.amountHarvested += creepActor.harvestCapacity();
        }
    }

    /**
     * A creep is full when the next harvest action would be wasteful.
     * @param {CreepActor} creepActor - creep actor executing the action
     */
    finished(creepActor) {
        const creep = creepActor.object('creep');
        return this.state.failure || (
            creep.carry.energy + this.amountHarvested >= creep.carryCapacity);
    }

    shortDescription() {
        return '⛏️';
    }

}

module.exports = Harvest;
