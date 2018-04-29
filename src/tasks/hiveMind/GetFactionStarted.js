const BaseTask = require('tasks.BaseTask');
const {
    T_GET_FACTION_STARTED,
    AT_HIVE_MIND
} = require('constants');
const InitializeColony = require('tasks.colony.InitializeColony');

/**
 * The GetFactionStarted task simply makes schedule the `InitializeColony` task.
 * on the attached colony
 */
class GetFactionStarted extends BaseTask {
    constructor(memory={}) {
        super(T_GET_FACTION_STARTED, AT_HIVE_MIND, memory);
    }

    execute(agent) {
        agent.agent('mainColony').scheduleTask(new InitializeColony());
    }
}

module.exports = GetFactionStarted;
