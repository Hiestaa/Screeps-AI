const BaseAgent = require('agents.BaseAgent');
const {
    AT_SPAWN_ACTOR
} = require('constants');

/**
 * The spawn actor is created to control the behavior of a spawn.
 * It does not manage any agent in itself
 */
class SpawnActor extends BaseAgent {
    /**
     * Initialize this spawn actor
     * @param {StructureSpawn} spawn - the spawn this actor should be related to
     */
    initialize(spawn) {
        super(`SpawnActor ${spawn.name}`,
              AT_SPAWN_ACTOR, {}, {spawn: spawn.id});

        // name -> profile
        // remembers which creeps were spawned by that particular spawn
        // will be populated by the T_SPAWN task.
        this.profilesSpawned = {};

        // profile -> number of creeps alive of that profile (spawned by this actor)
        this.nbSpawnedByProfile = {}
    }

    load(state) {
        super(state);
        this.profilesSpawned = state.profilesSpawned;
        // some creeps may be dead - delete them
        Object.keys(this.profilesSpawned).forEach(k => {
            const profile = this.profilesSpawned[k];
            if (!Game.creeps[k]) { delete this.profilesSpawned[k]; }
            else {
                this.nbSpawnedByProfile[profile] = (
                    this.nbSpawnedByProfile[profile] || 0) + 1;
            }
        });
    }

    save(state) {
        super(state);
        state.profilesSpawned = this.profilesSpawned;
    }}

module.exports = SpawnActor;
