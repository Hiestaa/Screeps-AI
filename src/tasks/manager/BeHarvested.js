const BaseTask = require('tasks.BaseTask');
const {
    AT_SOURCE_MANAGER,
    T_BE_HARVESTED,
    AT_CREEP_AGENT,
    A_HARVEST
} = require('constants');
const Harvest = require('tasks.creepActions.Harvest');

/**
 * The task of being harvested is given to a source manager.
 * This make sure all creep actors managed by this agent either are, or will
 * execute a A_HARVEST action on the source managed by this actor.
 */
class BeHarvested extends BaseTask {

    /**
     * Create or reload a BeHarvested task.
     * @param {Object} memory - stored memory, or provided bootstrap memory
     * @param {Float} [memory.priority] - priority for this task
     */
    constructor({priority}={}) {
        super(T_BE_HARVESTED, AT_SOURCE_MANAGER, {priority});
    }

    execute(agent) {
        Object.keys(agent.attachedAgents).forEach(key => {
            const creepActor = agent.attachedAgents[key];

            if (key === 'source') { return; }
            if (creepActor.type !== AT_CREEP_AGENT) { return; }

            if (creepActor.hasTaskScheduled(A_HARVEST)) { return; }

            creepActor.scheduleTask(
                new Harvest({
                    params: {sourceId: agent.attachedAgents.source.id}
                })
            );
        });
    }

    /**
     * The task is finished as soon as it is executed. This is a one-shot action.
     */
    finished() {
        return true;
    }

}

module.exports = BeHarvested;
