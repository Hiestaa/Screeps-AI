const BaseTask = require('tasks.BaseTask');
const {
    T_INITIALIZE_COLONY,
    AT_COLONY
} = require('constants');
const InitializeRoom = require('objectives.architect.InitializeRoom');
const PopulationControl = require('objectives.colony.PopulationControl');
// const logger = require('log').getLogger('tasks.colony.InitializeColony', 'white');

/**
 * The initialize colony will just schedule the 'InitializeRoom' task on the
 * architect dedicated to the spawn room.
 */
class InitializeColony extends BaseTask {
    constructor(memory={}) {
        super(T_INITIALIZE_COLONY, AT_COLONY, memory);
    }

    execute(colony) {
        if (!colony.hasObjective()) {
            colony.setObjective(new PopulationControl());
        }
        const architect = colony.agent('spawnRoomArchitect');
        architect.setObjective(new InitializeRoom());
    }
}

module.exports = InitializeColony;
