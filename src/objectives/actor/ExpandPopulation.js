const BaseObjective = require('objectives.BaseObjective');
const {
    AT_SPAWN_ACTOR,
    O_EXPAND_POPULATION,
    T_SPAWN
} = require('constants');
const Spawn = require('tasks.actor.Spawn');


/**
 * The ExpandPopulation schedules as many tasks as necessary on the spawn actor to
 * get the population to expand to the desired number of profiles.
 * When the desired number of profiles is reached, the objective will maintain the
 * population at the current level by scheduling Spawn tasks when appropriate.
 * At any point of time, the architect can reassign a new ExpandPopulation objective
 * to replace the current one.
 */
class ExpandPopulation extends BaseObjective {
    constructor({state, params: {profiles}, priority}={}) {
        super(O_EXPAND_POPULATION, AT_SPAWN_ACTOR, {
            state,
            params: {profiles},
            priority
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

        // count the number of creeps pending for creation for each profile
        const pendingPerProfile = {};
        spawnActor._tasksList.forEach(t => {
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

            if (nbMissing == 0) {
                for (var i = 0; i < nbMissing; i++) {
                    spawnActor.scheduleTask(new Spawn({params: {profile}}));
                }
            }
        });
    }
}

module.exports = ExpandPopulation;
