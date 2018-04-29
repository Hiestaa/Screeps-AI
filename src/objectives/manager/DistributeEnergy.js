const BaseObjective = require('objectives.BaseObjective');
const {
    AT_SOURCE_MANAGER,
    O_DISTRIBUTE_ENERGY,
    T_BE_HARVESTED
} = require('constants');
const BeHarvested = require('tasks.manager.BeHarvested');

/**
 * The DistributeEnergy objective simply re-schedule periodically
 * the T_BE_HARVESTED  task on the source manager that executes it.
 */
class DistributeEnergy extends BaseObjective {
    constructor(memory={}) {
        super(O_DISTRIBUTE_ENERGY, AT_SOURCE_MANAGER, memory, {
            frequency: 5
        });
    }

    execute(agent) {
        if (agent.hasTaskScheduled(T_BE_HARVESTED)) { return; }

        agent.scheduleTask(new BeHarvested());
    }
}

module.exports = DistributeEnergy;
