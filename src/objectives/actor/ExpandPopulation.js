const BaseObjective = require('objectives.BaseObjective');
const {
    AT_SPAWN_ACTOR,
    O_EXPAND_POPULATION,
    T_SPAWN,
    CP_HARVESTER,
    CP_WORKER,
    CP_HAULER
} = require('constants');
const SpawnTask = require('tasks.actor.Spawn');
const logger = require('log').getLogger('objectives.actor.ExpandPopulation', '#006DDC');

const PROFILES_PRIORITY = {
    [CP_HARVESTER]: 10,
    [CP_WORKER]: 5,
    [CP_HAULER]: 2
};

/**
 * The ExpandPopulation schedules as many tasks as necessary on the spawn actor to
 * get the population to expand to the desired number of profiles.
 * When the desired number of profiles is reached, the objective will maintain the
 * population at the current level by scheduling Spawn tasks when appropriate.
 * At any point of time, the architect can reassign a new ExpandPopulation objective
 * to replace the current one.
 */
class ExpandPopulation extends BaseObjective {
    /**
     * Build a new ExpandPopulation objective.
     * @param {Object} data - objective instance data
     * @param {Object} data.params - parameter for this objective instance
     * @param {Array<CONST>} data.params.profiles - the creep profiles to spawn
     * @param {ObjectId} data.params.handlerId - id of the agent that will handle the creep
     *                   actor that will be created (the architect of the room in
     *                   which the creep actor will spawn)
     * @param {integer} [data.priority] - priority of this task
     * @param {Object} [data.state] - state of the task (used for reloading)
     */
    constructor({state, params: {profiles, handlerId}}={}) {
        super(O_EXPAND_POPULATION, AT_SPAWN_ACTOR, {
            state,
            params: {profiles: profiles || [], handlerId}
        });
    }

    /**
     * Assign tasks to get the population to grow towards the target
     * (defined as a list of profiles) then ensure it remains constant.
     * It does so by counting the number of creeps in each profile, and create additional
     * as needed.
     */
    execute(spawnActor) {
        // prevent expensive operation from running needlessly too often
        // TODO: make that a feature of the tasks and objective in a generic manner
        if (this.state.nextExec && Game.time < this.state.nextExec) { return; }
        this.state.nextExec = Game.time + 10;

        const handlerId = this.params.handlerId;
        // count the number of creeps pending for creation for each profile
        const pendingPerProfile = {};
        spawnActor.forEachScheduledTask(t => {
            if (t.type === T_SPAWN) {
                pendingPerProfile[t.params.profile] = (
                    pendingPerProfile[t.params.profile] || 0) + 1;
            }
        });

        Object.keys(this.params.profiles).forEach(profile => {
            // number of creeps we still need to create
            // total expected - already created (and not dead yet) - pending creation
            const nbMissing = (
                this.params.profiles[profile] -
                (spawnActor.nbSpawnedByProfile[profile] || 0) -
                (pendingPerProfile[profile] || 0)
            );
            // only schedule up to one task per profile, so we don't have a long waiting
            // line of tasks for the same profile which the priority is outdated
            if (nbMissing > 0 && (pendingPerProfile[profile] || 0) <= 1) {
                logger.debug(`Missing ${nbMissing} creeps profile ${profile}`);
                for (var i = 0; i < nbMissing; i++) {
                    spawnActor.scheduleTask(new SpawnTask({
                        // always maximize efficiency for now. We'll have reason to maximize other areas later.
                        params: {profile, handlerId: handlerId, maximize: 'efficiency'},
                        priority: PROFILES_PRIORITY[profile] || 1
                    }));
                }
            }
        });
    }
}

module.exports = ExpandPopulation;
