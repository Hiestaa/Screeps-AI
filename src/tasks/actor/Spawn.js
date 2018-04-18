const BaseTask = require('tasks.BaseTask');
const {
    AT_SPAWN_ACTOR,
    T_SPAWN
} = require('constants');
const profiles = require('creepProfiles');

 class Spawn extends BaseTask {
    constructor({priority, state, params: {profile}}) {
        super(T_SPAWN, AT_SPAWN_ACTOR, {priority, state, params: {profile}});
    }

    /**
     * If the spawn has enough energy, spawn a new creep of the desired profile.
     */
    execute(spawnActor) {
        const spawn = spawnActor.object('spawn');
        const Profile = WorkerProfile
        let profileInstance = null;
        if (!this.state.cost) {
            profileInstance = profileInstance || new profiles[profile]();
            this.state.cost = profileInstance.cost;
        }
        if (spawn.energyCapacity > this.state.cost) {
            profileInstance = profileInstance || new profiles[profile]();
            // TODO: now find a way to get that linked to a CreepActor, and get that
            // creepActor added to a group... Fun times.
            spawn.spawnCreep(profileInstance.bodyParts, profileInstance.getCreepName());
        }
    }

    finished(spawnActor) {
        const spawn = spawnActor.object('spawn');
        return spawn.energyCapacity > this.state.cost
    }
}
