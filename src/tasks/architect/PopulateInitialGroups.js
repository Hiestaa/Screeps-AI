const BaseTask = require('tasks.BaseTask');
const {
    getAgentById
} = require('agents.AgentsManager.storage');
const {
    T_POPULATE_INITIAL_GROUPS,
    AT_ARCHITECT
} = require('constants');

// more than one because at this point there is no dedicated hauler (there might never be)
const CREEP_PER_MINING_SPOT = 1.5;

// 100% of the creep capacity for this room should be dedicated to filling up the spawn
// TODO: make that a 20%
// const NB_CREEPS_FOR_SPAWN = 1.0;

/**
 * Assign creepActors to the initial groups.
 * This will assign each actor to one of the source manager so it can receive
 * harvest tasks, and one of the building, spawner or controller group so
 * it can carry this energy back for use.
 * An improvement could be to add the spawner actors to all groups but have
 * each corresponding task assigned to agents with a lower priority, so it would
 * be executed first.
 * For now we're assigning everything to the spawn group, so we can spawn more
 * creep.
 * TODO: assign part of the creeps to other groups, when they will exist
 * For now we're assuming that all creeps are worker. In the future, this task
 * should be make specific to workers and have another task take care of the defense,
 * attach, claim, etc...
 * TODO: Make other version of the task that can populate other kinds of creeps for
 * other purposes. This one should remain specific to the workers. In a given room,
 * the architect should have the objective of always maximizing the number of workers
 * able to harvest from a source at the same time.
 */
class PopulateInitialGroups extends BaseTask {
    constructor({state, params: {creepActorIds}}={}) {
        super(T_POPULATE_INITIAL_GROUPS, AT_ARCHITECT, {state, params: {creepActorIds}});
    }

    execute(architect) {
        const creepActors = this.params.creepActorIds.map(id => getAgentById(id));

        // copy the array - we'll distribute one of each of these to the sources of this room
        const creepActorsForSources = Array.from(creepActors);
        // for each source manager, assign as many new agent as there is empty spots
        const sourceManagers = architect.getSourceManagers().map(sm => {
            const nbMiningSpots = sm.getNbMiningSpots();
            const emptySpots = nbMiningSpots * CREEP_PER_MINING_SPOT - sm.nbCreepActors;
            if (emptySpots > 0) {
                creepActorsForSources.splice(0, emptySpots).forEach(creepActor => {
                    return sm.handleNewAgent(creepActor);
                });
            }
            return {sm, v: sm.nbCreepActors / nbMiningSpots};
        }).sort((a, b) => b.v - a.v).map(({sm}) => sm);

        // now distribute one remaining creep to each source
        creepActorsForSources.forEach((creepActor, idx) => {
            sourceManagers[idx % sourceManagers.length].handleNewAgent(creepActor);
        });

        // now distribute all creeps to the spawner
        // this will be improved shortly
        creepActors.forEach(creepActor => {
            this.agent('spawn').handleNewAgent(creepActor);
        });

        // at this point, the creep actors should each be assigne to a worker group
        // and a harvest group. If these have the proper objetive assigned,
        // the creeps should start receiving tasks!
    }
}

module.exports = PopulateInitialGroups;
