const BaseTask = require('tasks.BaseTask');
const {
    AT_SPAWN_MANAGER,
    T_FILLUP,
    AT_CREEP_AGENT,
    A_HAUL
} = require('constants');
const Haul = require('tasks.creepActions.Haul');

/**
 * The task of being harvested is given to a source manager.
 * This make sure all creep actors managed by this agent either are, or will
 * execute a A_HARVEST action on the source managed by this actor.
 */
class FillUp extends BaseTask {
    constructor({priority, params, state}={}) {
        super(T_FILLUP, AT_SPAWN_MANAGER, {priority, params, state});
    }

    execute(spawnManager) {
        Object.keys(spawnManager.attachedAgents).forEach(key => {
            const creepActor = spawnManager.attachedAgents[key];

            if (key === 'source') { return; }
            if (creepActor.type !== AT_CREEP_AGENT) { return; }

            if (creepActor.hasTaskScheduled(A_HAUL)) { return; }

            creepActor.scheduleTask(
                new Haul({
                    params: {targetId: spawnManager.agent('spawn').id}
                })
            );
        });
    }

    /**
     * The task is finished when the spawn is full of energy
     * Note that this is most likely not going to last for long, as the
     * spawn actor might take this opportunity to spawn a creep following the
     * assigned objective.
     * @param {SpawnManager} spawnManager - the spawn manager executing this action
     */
    finished(spawnManager) {
        const spawn = spawnManager.object('spawn');
        return spawn.energy >= spawn.energyCapacity;
    }
}

module.exports = FillUp;
