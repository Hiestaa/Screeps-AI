const BaseTask = require('tasks.BaseTask');
const {
    T_INITIALIZE_COLONY,
    AT_COLONY,
    CP_WORKER
} = require('constants');
const InitializeRoom = require('objectives.architect.InitializeRoom');
const ExpandPopulation = require('objectives.actor.ExpandPopulation');
const logger = require('log').getLogger('tasks.colony.InitializeColony', '#B0CA34');

/**
 * This task will compute the number of creeps needed to initialize the
 * colony, and schedule the `ExpandPopulation` task on the spawn actor accordingly.
 * On top of that, it will schedule the 'InitializeRoom' task on the
 * architect dedicated to the spawn room.
 */
class InitializeColony extends BaseTask {
    constructor(memory={}) {
        super(T_INITIALIZE_COLONY, AT_COLONY, memory);
    }

    execute(colony) {
        const architect = colony.agent('spawnRoomArchitect');

        // initially only schedule one worker per source.
        // these will be used in priority to refill the spawn, and to
        // build construction sites.
        // there should be an objective that will make sure to replace this
        // ExpandPopulation objective with a broader one, including more diverse
        // profiles, when the architect moves on to the UpgradeRCL2 objective.
        const nbSpots = architect.getSourceManagers().length;
        let profiles = [];
        for (var i = 0; i < nbSpots; i++) {
            profiles.push(CP_WORKER);
        }

        // profiles = profiles.concat(INITIAL_ROOM_DEFENSE);

        logger.debug('Constructing ExpandPopulation objective with profiles: ' +
                     profiles.join(', '));
        colony.agent('spawnActor').setObjective(new ExpandPopulation({
            params: {profiles, handlerId: architect.id}}));

        // const initialCreepsCount = {};
        // profiles.forEach(cp => {
        //     initialCreepsCount[cp] = (profiles[cp] || 0 )+ 1;
        // });
        architect.setObjective(new InitializeRoom());
    }
}

module.exports = InitializeColony;
