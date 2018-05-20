const BaseAgent = require('agents.BaseAgent');
const Colony = require('agents.Colony');
const {
    AT_HIVE_MIND
} = require('constants');
const OverseeEmpire = require('objectives.hiveMind.OverseeEmpire');

/**
 * The hive mind is attached to the no game object in particular, a
 * and manages a list of colonies.
 */
class HiveMind extends BaseAgent {
    /**
     * Initialize the HiveMind.
     */
    initialize() {
        super.initialize('Hive Mind', AT_HIVE_MIND, {}, {});
        const spawnNames = Object.keys(Game.spawns);
        if (spawnNames.length == 0) {
            return;
        }

        const colony = new Colony();
        colony.initialize(Game.spawns[spawnNames[0]]);
        this.attachAgent('mainColony', colony);

        // more colonies will be attached when the faction has the ability
        // to expand to uncharted territories. These will happen
        // when executing the appropriate tasks.
    }

    run() {
        super.run();
        if (!this.currentObjective) {
            this.setObjective(new OverseeEmpire());
        }
    }

}

module.exports = HiveMind;