const BaseCreepAction = require('tasks.creepActions.BaseCreepAction');
const {
    A_BUILD,
    CP_WORKER,
} = require('constants');
const logger = require('log').getLogger('tasks.creepActions.Build', 'white');
const SuperFetch = require('tasks.creepActions.SuperFetch');

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
        this.amountSpent = 0;
    }

    execute(creepActor) {
        super.execute(creepActor);
        const creep = creepActor.object('creep');

        // if no energy schedule a SuperFetch task that will look for a container,
        // dropped energy resource or source to get energy from
        if (creep.carry.energy === 0) {
            this.hasFinished = true;

            creepActor.scheduleTask(new SuperFetch({
                priority: this.priority + 1
            }));
            creepActor.scheduleTask(new Build({
                priority: this.priority - 1,
                params: {siteId: this.params.siteId}
            }));
            return;
        }

        const site = Game.getObjectById(this.params.siteId);

        const code = creep.build(site);
        if(code == ERR_NOT_IN_RANGE) {
            creep.moveTo(site, {visualizePathStyle: {stroke: '#72FF00'}});
        }
        else if (code !== OK) {
            logger.failure(
                code, 'Couldn\'t build designated construction site: ' +
                this.params.siteId);
            this.state.failure = true;
        }
        else {
            this.amountSpent = creepActor.buildCapacity();
        }
    }

    /**
     * A creep is finished upgrading when it is empty.
     * @param {CreepActor} creepActor - creep actor executing the action
     */
    finished(creepActor) {
        // const site = Game.getObjectById(this.params.siteId);
        return (
            creepActor.object('creep').carry.energy - this.amountSpent) == 0
            // || site.progress + this.amountSpent >= site.progressTotal
            || this.state.failure;
    }

    shortDescription() {
        return '🚧';
    }
}

module.exports = Build;
