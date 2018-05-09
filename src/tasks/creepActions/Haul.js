const BaseCreepAction = require('tasks.creepActions.BaseCreepAction');
const {
    A_HAUL,
    CP_WORKER,
    CP_HAULER
} = require('constants');
const Fetch = require('tasks.creepActor.Fetch');
const Carry = require('tasks.creepActor.Carry');
const logger = require('log').getLogger('tasks.creepActions.Haul', 'white');

/**
 * Haul energy from a container to a deposit.
 * This is a wrapper around fetch and carry actions. This action is a one shot:
 * it schedule the appropriate tasks upon execution, then finishes right away.
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
     * @param {ObjectId} memory.params.fromContainerId - id of the container from which to grab the energy
     * @param {ObjectId} memory.params.toDeposit - id of the spawn/container/extension to which to deposit the energy
     * @param {Object} [memory.state] - the state of this objective, if the objective has
     *                 already been started.
     */
    constructor({priority, params: {fromContainerId, toDepositId}, state}) {
        super(new Set([CP_WORKER, CP_HAULER]), A_HAUL, {
            params: {fromContainerId, toDepositId},
            state,
            priority
        });
        this.amountTransferred = 0;
        this.amountFetched = 0;
    }

    // compute the available space to deposit energy
    computeEnergyCapacity(creepActor) {
        const creep = creepActor.object('creep');
        const deposit = (
            Game.spawns[this.params.depositId] ||
            Game.creeps[this.params.depositId] ||
            Game.getObjectById(this.params.depositId)
        );
        let storeSpace = 0;
        if (deposit.energyCapacity) {
            storeSpace = deposit.energyCapacity - deposit.energy;
        }
        else if (deposit.carryCapacity) {
            storeSpace = deposit.carryCapacity - _.sum(deposit.carry);
        }
        else if (deposit.storeCapacity) {
            storeSpace = deposit.storeCapacity - _.sum(deposit.store);
        }
        else {
            logger.warning('Unable to get store capacity from deposit: ' + deposit.id || deposit.name);
        }

        return Math.min(storeSpace, creep.carryCapacity);
    }

    execute(creepActor) {
        super.execute(creepActor);
        const creep = creepActor.object('creep');

        const requirement = this.computeEnergyCapacity(creepActor);
        // if we have enough resource to fill up the designated container,
        // we don't need to go and fetch - carry straight away
        if (requirement > creep.carry[RESOURCE_ENERGY]) {
            creepActor.scheduleTask(new Fetch({
                params: {containerId: this.params.fromContainerId},
                priority: this.priority
            }));
        }
        creepActor.scheduleTask(new Carry({
            params: {depositId: this.params.toDepositId},
            priority: this.priority
        }));

    }

    /**
    *
     */
    finished(/*creepActor*/) {
        return true;
    }

    shortDescription() {
        return '👜';
    }
}

module.exports = Haul;
