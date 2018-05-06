const BaseObjective = require('objectives.BaseObjective');
const {
    AT_SPAWN_ACTOR,
    O_EXPAND_POPULATION,
    T_SPAWN
} = require('constants');
const SpawnTask = require('tasks.actor.Spawn');
const logger = require('log').getLogger('objectives.actor.ExpandPopulation', '#006DDC');

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
        // count (and save as this never changes within the objective's lifespan)
        // the number of creeps that should be spawned for each profile.
        if (!this.state.nbPerProfile) {
            this.state.nbPerProfile = {};
            this.params.profiles.forEach(p => {
                this.state.nbPerProfile[p] = (this.state.nbPerProfile[p] || 0) + 1;
            });
        }

        const handlerId = this.params.handlerId;
        // count the number of creeps pending for creation for each profile
        const pendingPerProfile = {};
        spawnActor.forEachScheduledTask(t => {
            if (t.type === T_SPAWN) {
                pendingPerProfile[t.params.profile] = (
                    pendingPerProfile[t.params.profile] || 0) + 1;
            }
        });

        Object.keys(this.state.nbPerProfile).forEach(profile => {
            // number of creeps we still need to create
            // total expected - already created (and not dead yet) - pending creation
            const nbMissing = (
                this.state.nbPerProfile[profile] -
                (spawnActor.nbSpawnedByProfile[profile] || 0) -
                (pendingPerProfile[profile] || 0)
            );
            if (nbMissing > 0) {
                logger.debug(`Missing ${nbMissing} creeps profile ${profile}`);
                for (var i = 0; i < nbMissing; i++) {
                    spawnActor.scheduleTask(new SpawnTask({params: {profile, handlerId: handlerId}}));
                }
            }
        });
    }
}

module.exports = ExpandPopulation;
