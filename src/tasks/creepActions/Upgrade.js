const BaseCreepAction = require('tasks.creepActions.BaseCreepAction');
const {
    A_UPGRADE,
    CP_WORKER
} = require('constants');
const SuperFetch = require('tasks.creepActions.SuperFetch');
const logger = require('log').getLogger('tasks.creepAction.Upgrade', 'white');


/**
 * Move towards the assigned controller until reach, then upgrade the
 * controller until energy depletion.
 * TODO: to make them smarter and avoid dealing with haulers right now,
 * make the creep look for energy in a container nearby the controller if there is one,
 * or from a container anywhere in the room, or harvest the energy by themselves.
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
        this.hasFinished = false;
    }


    execute(creepActor) {
        super.execute(creepActor);

        const target = Game.getObjectById(this.params.controllerId);
        const creep = creepActor.object('creep');

        // if no energy schedule a SuperFetch task that will look for a container,
        // dropped energy resource or source to get energy from
        if (creep.carry.energy === 0) {
            this.hasFinished = true;

            creepActor.scheduleTask(new SuperFetch({
                priority: this.priority + 1
            }));
            creepActor.scheduleTask(new Upgrade({
                priority: this.priority - 1,
                params: {controllerId: this.params.controllerId}
            }));
            return;
        }
        // otherwise, move towards the controller.
        const code = creep.upgradeController(target, RESOURCE_ENERGY);
        if(code == ERR_NOT_IN_RANGE) {
            creep.moveTo(target, {visualizePathStyle: {stroke: '#ffffff'}});
        }
        else if (code !== OK) {
            logger.failure(code, `Creep ${creep.name} is unable to upgrade controller of room: ${target.room.name}`);
            this.hasFinished = true;
        }
    }

    /**
     * A creep is finished upgrading when it is empty.
     * @param {CreepActor} creepActor - creep actor executing the action
     */
    finished(/* creepActor */) {
        return this.hasFinished; // TODO: make so that the task is finished after one cycle
    }

    shortDescription() {
        return '⬆️';
    }
}

module.exports = Upgrade;
