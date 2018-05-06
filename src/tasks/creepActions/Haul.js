const BaseCreepAction = require('tasks.creepActions.BaseCreepAction');
const {
    A_HAUL,
    CP_WORKER,
    CP_HAULER
} = require('constants');
const logger = require('log').getLogger('tasks.creepActions.Haul', 'white');

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
        this.amountTransferred = 0;
    }

    execute(creepActor) {
        super.execute(creepActor);

        const creep = creepActor.object('creep');
        if (creep.carry.energy === 0) { return; }
        const target = Game.getObjectById(this.params.targetId);
        if (target.energyCapacity && target.energy >= target.energyCapacity) { return; }
        if (target.carryCapacity && _.sum(target.carry) >= target.carryCapacity) { return; }

        const code = creep.transfer(target, RESOURCE_ENERGY);
        if(code == ERR_NOT_IN_RANGE) {
            creep.moveTo(target, {visualizePathStyle: {stroke: '#FFEA00'}});
        }
        else if (code !== OK) {
            logger.failure(code, 'Couldn\'t transfer stored energy');
            this.state.failure = true;
        }
        else {
            // all the energy will be transfered in one tick
            this.amountTransferred = creep.carry.energy;
        }
    }

    /**
     * A creep is finished hauling when it is empty, is expected to be empty at
     * the next turn, has completely filled in the target energy reserve / carry capacity,
     * or has had any kind of failure (other than ERR_NOT_IN_RANGE) while trying
     * to transfer the energy.
     * @param {CreepActor} creepActor - creep actor executing the action
     */
    finished(creepActor) {
        const target = Game.getObjectById(this.params.targetId);
        const creep = creepActor.object('creep');
        return (
            creep.carry.energy - this.amountTransferred) == 0
            || (target.energy && target.energy + this.amountTransferred >= target.energyCapacity)
            || (target.carryCapacity && _.sum(target.carry) + this.amountTransferred) >= target.carryCapacity
            || this.state.failure;
    }

    shortDescription() {
        return '👜';
    }
}

module.exports = Haul;
