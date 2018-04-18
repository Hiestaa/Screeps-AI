const BaseTask = require('task.BaseTask');
const {
    T_GET_FACTION_STARTED,
    AT_HIVE_MIND
} = require('constants');
InitializeColony = require('task.colony.InitializeColony');

/**
 * The GetFactionStarted task simply makes schedule the `InitializeColony` task.
 * on the attached colony
 */
class GetFactionStarted extends BaseTask {
    constructor({state, priority}={}) {
        super(T_GET_FACTION_STARTED, AT_HIVE_MIND, {state, priority});
    }

    execute(agent) {
        agent.agent('mainColony').scheduleTask(new InitializeColony());
    }
}
