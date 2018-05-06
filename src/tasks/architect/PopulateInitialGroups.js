const BaseTask = require('tasks.BaseTask');
const {
    getAgentById
} = require('agents.AgentsManager.storage');
const {
    T_POPULATE_INITIAL_GROUPS,
    AT_ARCHITECT,
    CP_WORKER,
    CP_HEALER,
    CP_FIGHTER,
    CP_RANGED_FIGHTER
} = require('constants');

/**
 * Assign creepActors to the appropriate groups.
 * This will assign each worker to one of the source manager so it can receive
 * harvest tasks, and to each manager group (building, controller, spawn) that
 * will then assign tasks to creeps they manage with the priority that depends
 * on their objective.
 * The fighter, healer or ranged figher will be assigned to the defense group.
 * This should only be used to assign initial creep workers (or fighters) to be
 * used when we do not yet have the ability to make use of dedicated creep types.
 */
class PopulateInitialGroups extends BaseTask {
    constructor({state, params: {creepActorIds}, priority}={}) {
        super(T_POPULATE_INITIAL_GROUPS, AT_ARCHITECT, {state, params: {creepActorIds}, priority});
    }

    execute(architect) {
        const creepActors = this.params.creepActorIds.map(id => getAgentById(id));

        // copy the array - we'll distribute one of each of these to the sources of this room
        const creepActorsForFight = Array.from(creepActors)
            .filter(ca => [
                CP_HEALER,
                CP_FIGHTER,
                CP_RANGED_FIGHTER
            ].indexOf(ca.creepProfile) >= 0);
        const creepActorsForSpawn = Array.from(creepActors)
            .filter(ca => ca.creepProfile === CP_WORKER);
        const creepActorsForSources = Array.from(creepActorsForSpawn);

        // for each source manager, assign as many new agent as there is empty spots
        const sourceManagers = architect.getSourceManagers().map(sm => {
            const nbMiningSpots = sm.getNbMiningSpots();
            const emptySpots = 1 - sm.nbCreepActors;
            if (emptySpots > 0) {
                creepActorsForSources.splice(0, emptySpots).forEach(creepActor => {
                    return sm.handleNewAgent(creepActor);
                });
            }
            return {sm, v: sm.nbCreepActors / nbMiningSpots};
        }).sort((a, b) => a.v - b.v).map(({sm}) => sm);

        // now distribute one remaining creep to each source
        creepActorsForSources.forEach((creepActor, idx) => {
            sourceManagers[idx % sourceManagers.length].handleNewAgent(creepActor);
        });

        // now distribute all creeps to the spawner
        creepActorsForSpawn.forEach(creepActor => {
            architect.agent('spawn').handleNewAgent(creepActor);
        });

        // now distribute all creeps to the building group
        creepActorsForSpawn.forEach(creepActor => {
            architect.agent('builders').handleNewAgent(creepActor);
        });

        // at this point, the creep actors should each be assigned to a worker group
        // and a harvest group. If these have the proper objetive assigned,
        // the creeps should start receiving tasks!

        creepActorsForFight.forEach(creepActor => {
            const defenseGroup = architect.agent('defenseGroup');
            defenseGroup.handleNewAgent(creepActor);
        });
    }
}

module.exports = PopulateInitialGroups;
