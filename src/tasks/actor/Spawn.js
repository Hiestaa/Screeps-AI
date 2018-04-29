const BaseTask = require('tasks.BaseTask');
const {
    AT_SPAWN_ACTOR,
    T_SPAWN
} = require('constants');
const {
    buildPendingCreepActor
} = require('agents.AgentsManager.build');
const profiles = require('creepsProfiles');
const logger = require('log').getLogger('tasks.actor.Spawn', '#00FF90');

class SpawnTask extends BaseTask {
    /**
     * Build a new SpawnTask.
     * @param {Object} data - task instance data
     * @param {Object} data.params - parameter for this task instance
     * @param {CONST} data.params.profile - the creep profile to spawn
     * @param {ObjectId} data.params.handlerId - id of the agent that will
     *                   handle the creep actor that will be created
     * @param {integer} [data.priority] - priority of this task
     * @param {Object} [data.state] - state of the task (used for reloading)
     */
    constructor({priority, state, params: {profile, handlerId}}) {
        super(T_SPAWN, AT_SPAWN_ACTOR, {priority, state, params: {profile, handlerId}});
        this.doneSpawning = false;
    }

    /**
     * If the spawn has enough energy, spawn a new creep of the desired profile.
     */
    execute(spawnActor) {
        const {profile, handlerId} = this.params;
        let profileInstance = null;
        if (!this.state.cost) {
            profileInstance = profileInstance || new profiles[profile]();
            this.state.cost = profileInstance.cost;
        }
        if (spawnActor.energy() >= this.state.cost) {
            profileInstance = profileInstance || new profiles[profile]();
            const name = profileInstance.getCreepName();
            let code = buildPendingCreepActor(spawnActor, profileInstance, handlerId) ;
            if (code === OK) {
                spawnActor.profilesSpawned[name] = profile;
                spawnActor.nbSpawnedByProfile[profile] = (
                    spawnActor.nbSpawnedByProfile[profile] || 0) + 1;
                this.doneSpawning = true;
            }
            else {
                logger.failure(code, `Unable to spawn creep ${name}`);
            }
        }
    }

    finished() {
        return this.doneSpawning;
    }
}

module.exports = SpawnTask;
