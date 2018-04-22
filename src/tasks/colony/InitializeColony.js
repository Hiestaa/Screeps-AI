const BaseTask = require('tasks.BaseTask');
const {
    T_INITIALIZE_COLONY,
    AT_COLONY,
    CP_WORKER
} = require('constants');
const InitializeRoom = require('objectives.architect.InitializeRoom');
const ExpandPopulation = require('objectives.actor.ExpandPopulation');
const {
    CREEP_PER_MINING_SPOT
} = require('settings');

/**
 * This task will compute the number of creeps needed to initialize the
 * colony, and schedule the `ExpandPopulation` task on the spawn actor accordingly.
 * On top of that, it will schedule the 'InitializeRoom' task on the
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
        const profiles = [];

        for (var i = 0; i < nbCreeps; i++) {
            profiles.push(CP_WORKER);
        }

        console.log(
            '[DEBUG][INITIALIZE COLONY] Defining spawn actor objective ExtendPopulation(profiles=' +
            JSON.stringify(profiles) + ')');
        colony.agent('spawnActor').setObjective(
            new ExpandPopulation({params: profiles}));
        architect.setObjective(new InitializeRoom());
    }
}

module.exports = InitializeColony;
