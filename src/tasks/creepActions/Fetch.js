const BaseCreepAction = require('tasks.creepActions.BaseCreepAction');
const {
    A_FETCH,
    CP_WORKER,
    CP_HAULER
} = require('constants');
const logger = require('log').getLogger('tasks.creepActions.Fetch', 'white');

/**
 * Fetch energy from a container
 * TODO: Make sure Fetchers move out of the way if they have
 * nowhere to deposit energy to....
 * Right now they will just stop in the middle of the way :D
 */
class Fetch extends BaseCreepAction {
    /**
     * Create or reload a Fetch action.
     * @param {Float} [memory.priority] - priority for this action, used by the agent to control
     *                the execution order of his action.
     *                this MUST be provided when INSTANCIATING or RELOADING the objective.
     * @param {Object} memory.params - parameters for this objective, beware that
                       some objectives might have some required parameters
     * @param {ObjectId} memory.params.containerId - id of the container from which to grab the energy
     * @param {Resource} memory.params.resourceId - id of the resource to fetch.
     *                   Only one of `resourceId` and `containerId` will be considered.
     * @param {Object} [memory.state] - the state of this objective, if the objective has
     *                 already been started.
     */
    constructor({priority, params: {containerId, resourceId}, state}) {
        super(new Set([CP_WORKER, CP_HAULER]), A_FETCH, {
            params: {containerId, resourceId},
            state,
            priority
        });
        this.amountFetched = 0;
    }

    execute(creepActor) {
        super.execute(creepActor);
        let container, resource;
        if (this.params.containerId) {
            container = Game.getObjectById(this.params.containerId);
        }
        else if (this.params.resourceId) {
            resource = Game.getObjectById(this.params.resourceId);
        }
        const creep = creepActor.object('creep');
        // TODO: can't withdraw more than there is energy dropped!
        const energyToWithdraw = creep.carryCapacity - _.sum(creep.carry);
        let code;
        if (container) {
            code = creep.withdraw(container, RESOURCE_ENERGY, energyToWithdraw);
        }
        else {
            code = creep.pickup(resource);
        }
        if (code === ERR_NOT_IN_RANGE) {
            creep.moveTo(container || resource, {visualizePathStyle: {stroke: '#FFEA00'}});
        }
        else if (code === ERR_FULL) {
            // something wrong must have happened, if we were full we should have tried to withdraw 0 energy :[
            this.amountFetched = energyToWithdraw;
        }
        else if (code === ERR_NOT_ENOUGH_RESOURCES) {
            // no worries, patiently wait
            creep.moveTo(Math.round(Math.random() * 50), Math.round(Math.random() * 50));
            logger.info('Waiting for resources to be available...');
        }
        else if (code !== OK) {
            logger.failure(code, 'Unable to fetch energy from container: ' + this.params.containerId);
        }
        else {
            this.amountFetched = energyToWithdraw;
        }
    }

    finished(creepActor) {
        const creep = creepActor.object('creep');
        return _.sum(creep.carry) + this.amountFetched >= creep.carryCapacity;
    }

    shortDescription() {
        return '👜';
    }
}

module.exports = Fetch;
