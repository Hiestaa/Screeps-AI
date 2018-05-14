const BaseCreepAction = require('tasks.creepActions.BaseCreepAction');
const {
    A_CARRY,
    CP_WORKER,
    CP_HAULER
} = require('constants');
const logger = require('log').getLogger('tasks.creepActions.Carry', 'white');

/**
 * Carry energy back to the assigned deposit.
 * TODO: Make sure creeps move out of the way if they have
 * nowhere to deposit energy to....
 * Right now they will just stop in the middle of the way :D
 */
class Carry extends BaseCreepAction {
    /**
     * Create or reload a Carry action.
     * @param {Float} [memory.priority] - priority for this action, used by the agent to control
     *                the execution order of his action.
     *                this MUST be provided when INSTANCIATING or RELOADING the objective.
     * @param {Object} memory.params - parameters for this objective, beware that
                       some objectives might have some required parameters
     * @param {ObjectId} memory.params.depositId - id of the target to which to deposit the resources
     * @param {Object} [memory.state] - the state of this objective, if the objective has
     *                 already been started.
     */
    constructor({priority, params: {depositId}, state}) {
        super(new Set([CP_WORKER, CP_HAULER]), A_CARRY, {
            params: {depositId},
            state,
            priority
        });
        this.amountTransferred = 0;
    }

    isFull(deposit) {
        if (deposit.energyCapacity) {
            return deposit.energy + this.amountTransferred >= deposit.energyCapacity;
        }
        if (deposit.carryCapacity) {
            return _.sum(deposit.carry) + this.amountTransferred >= deposit.carryCapacity;
        }
        if (deposit.storeCapacity) {
            return _.sum(deposit.store) + this.amountTransferred >= deposit.storeCapacity;
        }
        logger.warning('Unable to get store capacity from deposit: ' + deposit.id || deposit.name);
        return true;
    }

    amountToTransfer(creep, deposit) {
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

        return Math.min(storeSpace, creep.carry[RESOURCE_ENERGY]);
    }

    execute(creepActor) {
        super.execute(creepActor);

        const creep = creepActor.object('creep');
        if (creep.carry[RESOURCE_ENERGY] === 0) { return; }

        const deposit = (
            Game.spawns[this.params.depositId] ||
            Game.creeps[this.params.depositId] ||
            Game.getObjectById(this.params.depositId)
        );
        if (!deposit) {
            return logger.error(`Unable to find deposit ${this.params.depositId}`);
        }
        if (this.isFull(deposit)) { return; }

        const amount = this.amountToTransfer(creep, deposit);
        const code = creep.transfer(deposit, RESOURCE_ENERGY, amount);
        if(code == ERR_NOT_IN_RANGE) {
            creep.moveTo(deposit, {visualizePathStyle: {stroke: '#00FF1F'}});
            return;
        }
        else if (code === ERR_FULL) {
            this.amountTransferred = amount;
        }
        else if (code !== OK) {
            logger.failure(code, 'Couldn\'t transfer stored energy');
            this.state.failure = true;
        }
        else {
            // all the energy will be transfered in one tick, assuming there is enough
            // space in the container
            this.amountTransferred = amount;
        }
        // no need to compute that if we're still out of range
    }

    /**
     * A creep is finished hauling when it is empty, is expected to be empty at
     * the next turn, has completely filled in the target energy reserve / carry capacity,
     * or has had any kind of failure (other than ERR_NOT_IN_RANGE) while trying
     * to transfer the energy.
     * @param {CreepActor} creepActor - creep actor executing the action
     */
    finished(creepActor) {
        const deposit = Game.spawns[this.params.depositId] || Game.getObjectById(this.params.depositId);
        const creep = creepActor.object('creep');
        return (
            creep.carry.energy - this.amountTransferred) == 0
            || this.isFull(deposit)
            || this.state.failure;
    }

    shortDescription() {
        return '👜';
    }
}

module.exports = Carry;
