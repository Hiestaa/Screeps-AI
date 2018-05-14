const BaseCreepAction = require('tasks.creepActions.BaseCreepAction');
const {
    A_HARVEST_FOREVER,
    CP_WORKER,
    CP_HARVESTER
} = require('constants');
const logger = require('log').getLogger('tasks.creepActions.Harvest', '#FEBF00');

/**
 * Move to the mining spot designed by a container adjacent to a source
 * Forever mine the energy from the source and deposit it into the container
 */
class HarvestForever extends BaseCreepAction {
    /**
     * Create or reload a HarvestForever action.
     * @param {Float} [memory.priority] - priority for this action, used by the agent to control
     *                the execution order of his action.
     *                this MUST be provided when INSTANCIATING or RELOADING the objective.
     * @param {Object} memory.params - parameters for this objective, beware that
                       some objectives might have some required parameters
     * @param {ObjectId} memory.params.sourceId - id of the source from which to harvest.
     * @param {ObjectId} memory.papams.containerId - id of the container in which to deposit
     * @param {Object} [memory.state] - the state of this objective, if the objective has
     *                 already been started.
     */
    constructor({priority, params: {sourceId, containerId}, state}) {
        super(new Set([CP_WORKER, CP_HARVESTER]), A_HARVEST_FOREVER, {
            params: {sourceId, containerId},
            state,
            priority
        });
        this.amountHarvested = 0;
    }

    drop(creep, container) {
        if (container.pos.x !== creep.pos.x ||
            container.pos.y !== creep.pos.y) {
            return creep.moveTo(container);
        }
        const code = creep.drop(RESOURCE_ENERGY);
        if (code !== OK) {
            logger.failure(code, `${creep.name} was unable to drop energy`);
        }
    }

    execute(creepActor) {
        super.execute(creepActor);
        // const container = Game.getObjectById(this.params.containerId);
        const creep = creepActor.attachedGameObjects.creep;
        // if (creep.carry.energy === creep.energyCapacity) {
        //     this.drop(creep, container);
        //     return;
        // }
        var source = Game.getObjectById(this.params.sourceId);
        const code = creep.harvest(source);

        if(code === ERR_NOT_IN_RANGE) {
            creep.moveTo(source, {visualizePathStyle: {stroke: '#ffaa00'}});
        }
        else if (code !== OK) {
            logger.failure(code, 'Couldn\'t harvest energy from source ' + source.id.slice(0, 3));
        }
        else {
            // TODO: don't assume the source is going to be full
            this.amountHarvested += creepActor.harvestCapacity();
        }

        // we can drop in the same action! :)
        // but no need tho - jut keep harvesting until the full creep lets energy fall on the ground
        // if (creep.carry.energy + this.amountHarvested >= creep.carryCapacity) {
        //     this.drop(creep, container);
        // }
    }

    /**
     * A creep is full when the next harvest action would be wasteful.
     * @param {CreepActor} creepActor - creep actor executing the action
     */
    finished(/* creepActor */) {
        return false;
    }

    shortDescription() {
        return '⛏️∞';
    }

}

module.exports = HarvestForever;
