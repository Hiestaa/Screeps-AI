const BaseAgent = require('agents.BaseAgent');
const Colony = require('agents.Colony');
const {
    AT_HIVE_MIND
} = require('constants');

/**
 * The hive mind is attached to the no game object in particular, a
 * and manages a list of colonies.
 */
class HiveMind extends BaseAgent {
    /**
     * Initialize the HiveMind.
     */
    initialize() {
        super('Hive Mind', AT_HIVE_MIND, {}, {});

        const colony = new Colony();
        colony.initialize(Game.spawns.Spawn1);
        this.attachAgent('mainColony', colony);

        // more colonies will be attached when the faction has the ability
        // to expand to uncharted territories. These will happen
        // when executing the appropriate tasks.
    }
}

module.exports = HiveMind;