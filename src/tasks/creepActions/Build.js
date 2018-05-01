const BaseCreepAction = require('tasks.creepActions.BaseCreepAction');
const {
    A_BUILD,
    CP_WORKER,
} = require('constants');
const logger = require('log').getLogger('tasks.creepActions.Build', 'white');

/**
 * Build energy back to the assigned deposit.
 * TODO: Make sure Builders move out of the way if they have
 * nowhere to deposit energy to....
 * Right now they will just stop in the middle of the way :D
 */
class Build extends BaseCreepAction {
    /**
     * Create or reload a Build action.
     * @param {Float} [memory.priority] - priority for this action, used by the agent to control
     *                the execution order of his action.
     *                this MUST be provided when INSTANCIATING or RELOADING the objective.
     * @param {Object} memory.params - parameters for this objective, beware that
                       some objectives might have some required parameters
     * @param {ObjectId} memory.params.targetId - id of the target to which to deposit the resources
     * @param {Object} [memory.state] - the state of this objective, if the objective has
     *                 already been started.
     */
    constructor({priority, params: {siteId}, state}) {
        super(new Set([CP_WORKER]), A_BUILD, {
            params: {siteId},
            state,
            priority
        });
    }

    execute(creepActor) {
        super.execute(creepActor);
        const creep = creepActor.object('creep');
        const site = Game.getObjectById(this.params.siteId);

        const code = creep.build(site);
        if(code == ERR_NOT_IN_RANGE) {
            creep.moveTo(site, {visualizePathStyle: {stroke: '#72FF00'}});
        }
        else if (code !== OK) {
            logger.failure(code, 'Couldn\'t build designated construction site');
            this.state.failure = true;
        }
    }

    /**
     * A creep is finished upgrading when it is empty.
     * @param {CreepActor} creepActor - creep actor executing the action
     */
    finished(creepActor) {
        return creepActor.object('creep').carry.energy == 0 || this.state.failure;
    }

    shortDescription() {
        return '🚧';
    }
}

module.exports = Build;
