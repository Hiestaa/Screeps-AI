const BaseObjective = require('objectives.BaseObjective');
const {
    AT_SPAWN_MANAGER,
    O_STAY_FILLED_UP,
    T_FILLUP
} = require('constants');
const FillUp = require('tasks.manager.FillUp');


/**
 * This objective will schedule tasks to creeps within that group
 * instructing them to haul the energy they carry back to the spawn.
 */
class StayFilledUp extends BaseObjective {
    constructor(memory={}) {
        super(O_STAY_FILLED_UP, AT_SPAWN_MANAGER, memory);
    }

    execute(spawnManager) {
        const spawn = spawnManager.object('spawn');
        if (spawn.energy < spawn.energyCapacity) {
            if (!spawnManager.hasTaskScheduled(T_FILLUP)) {
                spawnManager.scheduleTask(new FillUp());
            }
        }
    }
}

module.exports = StayFilledUp;
