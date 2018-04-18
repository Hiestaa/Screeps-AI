const BaseObjective = require('objectives.BaseObjective');
const {
    AT_SOURCE_MANAGER,
    O_DISTRIBUTE_ENERGY
} = require('constants');
BeHarvested = require('tasks.manager.BeHarvested');

// The BeHarvested task will incurr a significant loop over all agents
// Avoid doing that too often, since a harvest task in itself takes a
// while to be executed, and may not be executed as soon as it is scheduled.
const RESCHEDULE_DELAY = 20;

/**
 * The DistributeEnergy objective simply re-schedule periodically
 * the T_BE_HARVESTED  task on the source manager that executes it.
 */
class DistributeEnergy extends BaseObjective {
    constructor({state}={}) {
        super(O_DISTRIBUTE_ENERGY, AT_SOURCE_MANAGER, {state});
    }

    execute(agent) {
        if (Game.time < this.state.waitUntil) { return; }

        this.state.waitUntil = Game.time + RESCHEDULE_DELAY;

        agent.scheduleTask(new BeHarvested());
    }
}

module.exports = DistributeEnergy;
