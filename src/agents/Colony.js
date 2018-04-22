const BaseAgent = require('agents.BaseAgent');
const Architect = require('agents.Architect');
const SpawnActor = require('agents.SpawnActor');
const {
    AT_COLONY
} = require('constants');

/**
 * The colony is instanciated on request of the hive mind,
 * is attached to a particular spawn actor and manages a list of architects.
 */
class Colony extends BaseAgent {
    /**
     * Initialize the agent to a working state
     * @param {SpawnStructure} spawn - spawn this colony is attached to.
     *                         a SpawnActor will be initialized for this object.
     */
    initialize(spawn) {
        const spawnActor = new SpawnActor();
        spawnActor.initialize(spawn);
        super.initialize(`Colony ${spawn.name}`, AT_COLONY, {
            spawnActor: spawnActor.id
        });

        const architect = new Architect();
        architect.initialize(spawn.room);
        this.attachAgent('spawnRoomArchitect', architect);

        // many more Architects will be attached to this agent as deemed necessary
        // by the executed tasks. However, only one room exists at the initialization phase.
    }
}

module.exports = Colony;
