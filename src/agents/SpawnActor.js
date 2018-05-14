const BaseAgent = require('agents.BaseAgent');
const {
    AT_SPAWN_ACTOR
} = require('constants');

/**
 * The spawn actor is created to control the behavior of a spawn.
 * It does not manage any agent in itself
 */
class SpawnActor extends BaseAgent {
    constructor(id) {
        super(id);
        this.nbSpawnedByProfile = {};
        this.profilesSpawned = {};
        // set at each tick, we don't need to remember across ticks
        this.usedEnergyDuringTick = 0;
    }
    /**
     * Initialize this spawn actor
     * @param {StructureSpawn} spawn - the spawn this actor should be related to
     */
    initialize(spawn) {
        super.initialize(`SpawnActor ${spawn.name}`,
            AT_SPAWN_ACTOR, {}, {spawn: spawn.name});

        // name -> profile
        // remembers which creeps were spawned by that particular spawn
        // will be populated by the T_SPAWN task.
        this.profilesSpawned = {};

        // profile -> number of creeps alive of that profile (spawned by this actor)
        // this should be populated by the T_SPAWN task as well but will be reloaded
        // after each tick anyway.
        this.nbSpawnedByProfile = {};
    }

    findGameObject(key, val) {
        if (key === 'spawn' && Game.spawns[val]) {
            return Game.spawns[val];
        }
        return Game.getObjectById(val);
    }

    load(state) {
        super.load(state);
        this.profilesSpawned = state.profilesSpawned;
        // some creeps may be dead - delete them
        Object.keys(this.profilesSpawned).forEach(k => {
            const profile = this.profilesSpawned[k];
            if (!Game.creeps[k]) {
                delete this.profilesSpawned[k];
            }
            else {
                this.nbSpawnedByProfile[profile] = (
                    this.nbSpawnedByProfile[profile] || 0) + 1;
            }
        });
    }

    /*
     * `energy` and `spawnCreep` are wrapper around the game object methods
     * to allow updating the actual energy capacity within the same tick.
     */

    energy() {
        return this.object('spawn').energy - this.usedEnergyDuringTick;
    }

    spawnCreep(bodyParts, creepName, cost, options) {
        const code = this.object('spawn').spawnCreep(bodyParts, creepName, options);
        if (code === OK) {
            this.usedEnergyDuringTick += cost;
        }
        return code;
    }

    save(state) {
        super.save(state);
        state.profilesSpawned = this.profilesSpawned;
    }}

module.exports = SpawnActor;
