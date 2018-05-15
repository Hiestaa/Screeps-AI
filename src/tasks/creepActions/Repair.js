const BaseCreepAction = require('tasks.creepActions.BaseCreepAction');
const {
    A_REPAIR,
    CP_WORKER,
} = require('constants');
const SuperFetch = require('tasks.creepActions.SuperFetch');
const logger = require('log').getLogger('tasks.creepActions.Repair', 'white');

/**
 * Repair energy back to the assigned deposit.
 * TODO: Make sure Builders move out of the way if they have
 * nowhere to deposit energy to....
 * Right now they will just stop in the middle of the way :D
 */
class Repair extends BaseCreepAction {
    /**
     * Create or reload a Repair action.
     * @param {Float} [memory.priority] - priority for this action, used by the agent to control
     *                the execution order of his action.
     *                this MUST be provided when INSTANCIATING or RELOADING the objective.
     * @param {Object} memory.params - parameters for this objective, beware that
                       some objectives might have some required parameters
     * @param {ObjectId} memory.params.structureId - id of the structure that needs repairing
     * @param {Object} [memory.state] - the state of this objective, if the objective has
     *                 already been started.
     */
    constructor({priority, params: {structureId}, state}) {
        super(new Set([CP_WORKER]), A_REPAIR, {
            params: {structureId},
            state,
            priority
        });
    }

    execute(creepActor) {
        super.execute(creepActor);
        const creep = creepActor.object('creep');
        const structure = Game.getObjectById(this.params.structureId);

        // if no energy schedule a SuperFetch task that will look for a container,
        // dropped energy resource or source to get energy from
        if (creep.carry.energy === 0) {
            this.hasFinished = true;

            creepActor.scheduleTask(new SuperFetch({
                priority: this.priority + 1
            }));
            creepActor.scheduleTask(new Repair({
                priority: this.priority - 1,
                params: {structureId: this.params.structureId}
            }));
            return;
        }

        // otherwise, move towards the structure
        const code = creep.repair(structure);
        if(code == ERR_NOT_IN_RANGE) {
            creep.moveTo(structure, {visualizePathStyle: {stroke: '#72FF00'}});
        }
        else if (code !== OK) {
            logger.failure(code, 'Couldn\'t repair designated structure');
            this.state.failure = true;
        }
    }

    /**
     * A creep is finished upgrading when it is empty.
     * @param {CreepActor} creepActor - creep actor executing the action
     */
    finished(creepActor) {
        const structure = Game.getObjectById(this.params.structureId);
        return (
            this.hasFinished ||
            creepActor.object('creep').carry.energy == 0 ||
            this.state.failure ||
            structure.hits === structure.hitsMax);
    }

    shortDescription() {
        return '🚧';
    }
}

module.exports = Repair;
