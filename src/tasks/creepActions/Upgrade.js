const BaseCreepAction = require('tasks.creepActions.BaseCreepAction');
const {
    A_UPGRADE,
    CP_WORKER
} = require('constants');


/**
 * Move towards the assigned controller until reach, then upgrade the
 * controller until energy depletion.
 * TODO: Make sure Haulers move out of the way if they have
 * nowhere to deposit energy to....
 * Right now they will just stop in the middle of the way :D
 */
class Upgrade extends BaseCreepAction {
    /**
     * Create or reload a Upgrade action.
     * @param {Float} [memory.priority] - priority for this action, used by the agent to control
     *                the execution order of his action.
     *                this MUST be provided when INSTANCIATING or RELOADING the objective.
     * @param {Object} memory.params - parameters for this objective, beware that
                       some objectives might have some required parameters
     * @param {ObjectId} memory.params.targetId - id of the target to which to deposit the resources
     * @param {Object} [memory.state] - the state of this objective, if the objective has
     *                 already been started.
     */
    constructor({priority, params: {controllerId}, state}) {
        super(new Set([CP_WORKER]), A_UPGRADE, {
            params: {controllerId},
            state,
            priority
        });
    }

    execute(creepActor) {
        super.execute(creepActor);
        const target = Game.getObjectById(this.params.controllerId);
        const creep = creepActor.object('creep');
        if (creep.carry.energy === 0) { return; }
        if(creep.upgradeController(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
            creep.moveTo(target, {visualizePathStyle: {stroke: '#ffffff'}});
        }
    }

    /**
     * A creep is finished upgrading when it is empty.
     * @param {CreepActor} creepActor - creep actor executing the action
     */
    finished(creepActor) {
        const creep = creepActor.object('creep');
        return creep.carry.energy == 0;
    }

    shortDescription() {
        return '⬆️';
    }
}

module.exports = Upgrade;
