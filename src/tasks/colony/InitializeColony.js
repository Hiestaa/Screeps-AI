const BaseTask = require('tasks.BaseTask');
const {
    T_INITIALIZE_COLONY,
    AT_COLONY,
    CP_WORKER,
    O_EXPAND_POPULATION
} = require('constants');
InitializeRoom = require('tasks.architect.InitializeRoom');


const CREEP_PER_MINING_SPOT = 1.5;

// 100% of the creep capacity for this room should be dedicated to filling up the spawn
// TODO: make that a 20%
const NB_CREEPS_FOR_SPAWN = 1.0;

/**
 * The InitializeColony will schedule the 'InitializeRoom' task on the
 * architect dedicated to the spawn room.
 */
class InitializeColony extends BaseTask {
    constructor({state}={}) {
        super(T_INITIALIZE_COLONY, AT_COLONY, {state});
    }

    execute(colony) {
        const architect = colony.agent('spawnRoomArchitect');
        const nbSpots = architect.countMiningSpots();

        const nbCreeps = nbSpots * CREEP_PER_MINING_SPOT;
        const nbCreepsForSpawn = nbCreeps * NB_CREEPS_FOR_SPAWN
        const profiles = [];

        for (var i = 0; i < NB_CREEPS_FOR_SPAWN; i++) {
            profiles.push(CP_WORKER)
        }

        colony.agent('spawnActor').setObjective(
            new ExpandPopulation({params: profiles}));
        architect.scheduleTask(new InitializeRoom());
    }
}
