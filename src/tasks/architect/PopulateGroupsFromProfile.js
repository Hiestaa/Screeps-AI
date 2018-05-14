const BaseTask = require('tasks.BaseTask');
const {
    getAgentById
} = require('agents.AgentsManager.storage');
const {
    T_POPULATE_GROUPS_FROM_PROFILE,
    AT_ARCHITECT,
    CP_WORKER,
    CP_HEALER,
    CP_FIGHTER,
    CP_RANGED_FIGHTER,
    CP_HARVESTER,
    CP_HAULER
} = require('constants');

/**
 * Assign creepActors to the appropriate groups, to be used to reach RCL2 and beyond.
 * This will assign creep actors to groups based on their profile.
 * Harvesters will be assigned to available spots on sources.
 * Workers will be assigned to both the building manager and the controller manager
 * Haulers will be assigned to the spawn manager and the logistic manager (TBD)
 * Fighters are still assigned to the defense group.
 */
class PopulateGroupsFromProfile extends BaseTask {
    constructor({state, params: {creepActorIds}, priority}={}) {
        super(T_POPULATE_GROUPS_FROM_PROFILE, AT_ARCHITECT, {state, params: {creepActorIds}, priority});
    }

    execute(architect) {
        const creepActors = this.params.creepActorIds.map(id => getAgentById(id));

        const creepActorsForFight = Array.from(creepActors)
            .filter(ca => [
                CP_HEALER,
                CP_FIGHTER,
                CP_RANGED_FIGHTER
            ].indexOf(ca.creepProfile) >= 0);
        const haulers = Array.from(creepActors)
            .filter(ca => ca.creepProfile === CP_HAULER);
        const workers = Array.from(creepActors)
            .filter(ca => ca.creepProfile === CP_WORKER);
        const harvesters = Array.from(creepActors)
            .filter(ca => ca.creepProfile === CP_HARVESTER);

        // for each source manager, assign as many new agent as there is empty spots
        const sourceManagers = architect.getSourceManagers().map(sm => {
            const nbMiningSpots = sm.getNbMiningSpots();
            const emptySpots = 1 - sm.nbCreepActors;
            if (emptySpots > 0) {
                harvesters.splice(0, emptySpots).forEach(creepActor => {
                    return sm.handleNewAgent(creepActor);
                });
            }
            return {sm, v: sm.nbCreepActors / nbMiningSpots};
        }).sort((a, b) => a.v - b.v).map(({sm}) => sm);

        // now distribute one remaining creep to each source
        harvesters.forEach((creepActor, idx) => {
            sourceManagers[idx % sourceManagers.length].handleNewAgent(creepActor);
        });

        // now distribute all haulers to the spawner
        const spawnManager = architect.agent('spawn');
        haulers.forEach(creepActor => {
            spawnManager.handleNewAgent(creepActor);
        });

        // if the spawner doesn't have any actor, and we have workers to assign to him, do so now.
        // the worker will *also* be assigned to upgrader, so that it doesn't sit here and
        // do nothin when the spawn is full
        if (spawnManager.nbCreepActors === 0 && workers.length > 0) {
            spawnManager.handleNewAgent(workers[0]);
        }

        // TODO: distribute all haulers to the logistic network, so the containers
        // adjacent to the controller get filled up

        // now distribute all workers to the building group
        workers.forEach(creepActor => {
            architect.agent('builders').handleNewAgent(creepActor);
        });

        // now distribute all workers to the controller group as well
        workers.forEach(creepActor => {
            architect.agent('controller').handleNewAgent(creepActor);
        });

        creepActorsForFight.forEach(creepActor => {
            const defenseGroup = architect.agent('defenseGroup');
            defenseGroup.handleNewAgent(creepActor);
        });
    }
}

module.exports = PopulateGroupsFromProfile;
