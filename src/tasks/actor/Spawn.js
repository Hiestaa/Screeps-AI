const BaseTask = require('tasks.BaseTask');
const {
    AT_SPAWN_ACTOR,
    T_SPAWN
} = require('constants');
const {
    buildPendingCreepActor
} = require('agents.AgentsManager.build');
const profiles = require('creepsProfiles');
const preInitCreepActor = require('agents.CreepActor.preInit');
const logger = require('log').getLogger('tasks.actor.Spawn', '#00FF90');
const findUtils = require('utils.find');

const MAX_UPGRADE_LEVEL = 50;
const MAX_SPAWN_DELAY = 1000;

class SpawnTask extends BaseTask {
    /**
     * Build a new SpawnTask.
     * @param {Object} data - task instance data
     * @param {Object} data.params - parameter for this task instance
     * @param {CONST} data.params.profile - the creep profile to spawn
     * @param {ObjectId} data.params.handlerId - id of the agent that will
     *                   handle the creep actor that will be created
     * @param {string} data.params.maximize - the creep profile property to maximize
     *                 This should be either 'efficiency' or 'toughness'
     * @param {integer} [data.priority] - priority of this task
     * @param {Object} [data.state] - state of the task (used for reloading)
     */
    constructor({priority, state, params: {profile, handlerId, maximize}}) {
        super(T_SPAWN, AT_SPAWN_ACTOR, {
            priority,
            state,
            params: {profile, handlerId, maximize}
        }, {frequency: 7});
        this.doneSpawning = false;
        this.extensions = null;
    }

    findAvailableExtensions(spawnActor) {
        const spawn = spawnActor.object('spawn');
        this.extensions = findUtils.findExtensions(spawn.room);
        return this.extensions;
    }

    computeCosts(spawn) {
        // TODO: account for available extensions
        const {profile, maximize} = this.params;
        logger.info(`[DEBUG] computeCost, maximizing ${maximize}.`);
        let profileInstance = null;
        let baseProfileInstance = new profiles[profile]();
        if (!maximize) {
            this.state.costs = {base: profileInstance.cost, maximized: profileInstance.cost, maximizedLevel: 0};
            return baseProfileInstance;
        }

        let maxLevel = 0;
        profileInstance = baseProfileInstance;
        logger.info(`[DEBUG] computeCost, base ${profile} cost = ${baseProfileInstance.cost}`);

        for (var i = 0; i < MAX_UPGRADE_LEVEL; i++) {
            let pi = new profiles[profile]({[maximize]: maxLevel + 1});
            logger.info(`[DEBUG] computeCost, ${profile} ${maximize} lvl ${maxLevel + 1}, cost = ${pi.cost}`);
            if (pi.cost <= spawn.energyCapacity) {
                maxLevel = maxLevel + 1;
                profileInstance = pi;
            }
            else {
                logger.info(`[DEBUG] computeCost, too expensive for spawn (energyCapacity=${spawn.energyCapacity})`);
                break;
            }
        }

        this.state.costs = {
            base: baseProfileInstance.cost,
            maximized: profileInstance.cost,
            maximizedLevel: maxLevel
        };
        return profileInstance;
    }

    doSpawn(spawnActor, profileInstance) {
        const {profile, handlerId, maximize} = this.params;
        const name = profileInstance.getCreepName();
        // pre-initialize the creep actor, and setup its memory already.
        // when the creep will be spawned, we won't need to wait for a full tick to get
        // the creep actor's memory setup.
        const creepActorMemory = preInitCreepActor(profileInstance);

        logger.info(`Spawning creep ${name} [profile=${profileInstance.name}, ` +
            `${maximize}=${this.state.costs.maximizedLevel}, cost=${profileInstance.cost}]`);

        let code = buildPendingCreepActor(
            spawnActor,
            creepActorMemory,
            profileInstance,
            handlerId,
            // use spawn energy after the energy available in the extensions
            this.extensions.concat([spawnActor.object('spawn')]));
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

    // get available energy accounting for all available extensions
    getAvailableEnergy(spawnActor) {
        const spawnEnergy = spawnActor.energy();
        if (!this.state.availableExtensionsIds) {
            this.extensions = this.findAvailableExtensions(spawnActor);
            this.state.availableExtensionsIds = this.extensions.map(e => e.id);
        }
        else {
            this.extensions = this.state.availableExtensionsIds.map(
                id => Game.getObjectById(id));
        }

        return _.sum(this.extensions.map(e => e.energy)) + spawnEnergy;
    }

    /**
     * If the spawn has enough energy, spawn a new creep of the desired profile.
     * The spawn will try to maximize the toughness of efficiency of the creep if `maximize` is specified.
     * If it hasn't gathered enough energy to fill its capacity and spawn the highest level capable after
     * MAX_SPAWN_DELAY ticks, it will (try to) spawn a non-upgraded version of the requested profile
     */
    execute(spawnActor) {
        const {profile, maximize} = this.params;
        if (!this.state.scheduleTime) { this.state.scheduleTime = Game.time; }


        let profileInstance = null;
        if (!this.state.costs) {
            // this will define `this.state.costs`
            profileInstance = this.computeCosts(spawnActor.object('spawn'));
        }

        const availableEnergy = this.getAvailableEnergy(spawnActor);
        if (availableEnergy >= this.state.costs.maximized) {
            profileInstance = profileInstance || new profiles[profile]({[maximize]: this.state.costs.maximizedLevel});
            this.doSpawn(spawnActor, profileInstance);
        }
        // if we've waited for a long time for the required energy but it never came,
        // just spawn the base creep
        else if (availableEnergy >= this.state.costs.base &&
                 Game.time > this.state.scheduleTime + MAX_SPAWN_DELAY) {
            logger.warning(`Unable to spawn maximized creep after ${MAX_SPAWN_DELAY} ticks - falling back on base level.`);
            profileInstance = new profiles[profile]();
            this.doSpawn(spawnActor, profileInstance);
        }

    }

    finished() {
        return this.doneSpawning;
    }
}

module.exports = SpawnTask;
