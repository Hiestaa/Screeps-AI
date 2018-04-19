const BaseAgent = require('agents.BaseAgent');
const {
    AT_CREEP_ACTOR
} = require('constants');

/**
 * The Manager is instanciated on request of an architect and is an abstraction
 * over any kind of agents that manages a list of creep actors (the only kind of actor to come in groups)
 * It is attached to no particular game object but manages a list of actors (the creep actors,
 * and more depending on the subclasses)
 */
class BaseManager extends BaseAgent {
    constructor(id) {
        super(id);
        this.nbCreepActors = 0;
    }

    /**
     * Initialize a manager
     * TODO: maybe add some state variable to retain pointers over which creep actor
     * has which creep profile, to ease dispatching tasks to the appropriate actor?
     * @param {String} name - name of this agent
     * @param {CONST} type - agent type (AT_* constant)
     * @param {Array} creepActorIds - list of actors of type AT_CREEP_ACTOR
                             attached to this manager
     * @param {Object} attachedAgents - mapping of key to attached agent ids to be
                       passed down to the `BaseAgent` constructor
     */
    initialize(name, type, creepActorIds, attachedAgentIds, attachedGameObjectIds) {
        creepActorIds = creepActorIds || [];
        attachedAgentIds = attachedAgentIds || {};
        for (let i = 0; i < creepActorIds.length; i++) {
            attachedAgentIds[`creep_${i}'`] = creepActorIds[i];
        }
        this.nbCreepActors = creepActorIds.length;
        this.totalCreepActors = creepActorIds.length;
        super(name, type, attachedAgentIds, attachedGameObjectIds);
    }

    load(state) {
        super(state);
        this.nbCreepActors = state.nbCreepActors;
        this.totalCreepActors = state.totalCreepActors;
    }

    save(state) {
        super(state);
        state.nbCreepActors = this.nbCreepActors;
        state.totalCreepActors = this.totalCreepActors;
    }

    handleNewAgent(agent) {
        if (agent.type === AT_CREEP_ACTOR) {
            this.attachedAgents[`creep_${this.totalCreepActors}`] = agent;
            this.attachedAgentIds[`creep_${this.totalCreepActors}`] = agent.id;
            this.nbCreepActors += 1;
            this.totalCreepActors += 1;
        }
        else {
            console.log('[ERROR][BASE MANAGER] Don\' know what to do with new agent of type', agent.type);
        }
    }

    // FIXME: make this function actually called when deleting a creep
    handleAgentDeath(agent) {
        // TODO: more efficient indexing... mmmmh...
        Object.keys(this.attachedAgents).forEach(k => {
            if (this.attachedAgents[k].id === agent.id) {
                delete this.attachedAgents[k];
                delete this.attachedAgentIds[k];
            }
        });
        this.nbCreepActors -= 1;

    }
}

module.exports = BaseManager;
