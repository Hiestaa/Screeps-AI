const BaseManager = require('agents.BaseManager');
const {
    AT_SPAWN_MANAGER
} = require('constants');

/**
 * The SpawnManager is instanciated on request of an architect and deals
 * with the concern of filling up the spawn with energy to fulfill creep spawning requests.
 * It is attached to the spawn game object and manages a list of creep actors.
 */
class SpawnManager extends BaseManager {
    /**
     * Initialize this spawn manager
     * @param {StructureSpawn} spawn - the spawn structure this spawn manager will have to deal with
     *                         the manager will declare the actor for this spawn structure.
     * @param {Array} - ids of creeps this manager can control
     */
    initialize(spawn, creepActorIds=[]) {
        super(
            `SpawnManager ${spawn.name}`,
            AT_SPAWN_MANAGER, creepActorIds, {}, {
                spawn: spawn.id
            }
        );
    }
}

module.exports = SpawnManager;
