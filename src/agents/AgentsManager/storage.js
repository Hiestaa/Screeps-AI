// FUNCTIONS RELATED TO THE MANAGEMENT OF AGENT INSTANCES (in module memory)

const logger = require('log').getLogger('agents.AgentsManager.storage', '#FC00FF');
const {
    AT_HIVE_MIND
} = require('constants');

let agents = [];
const agentsById = {};
// saves which agents are deleted
// (saves running over the entire list of agents when deleting one)
// (this doesn't need to be remembered accross ticks)
let deletedAgents = {};
// saves which agents are deleted, for the purpose of the checks by
// the `run` function of the agents when making sure dependeng agents are
// alive.
const allDeletedAgents = new Set();

exports.hasAgentBeenDeleted = (agentId) => {
    return allDeletedAgents.has(agentId);
};

exports.hasAnyAgentBeenDeleted = () => allDeletedAgents.size > 0;

/**
 * Returns the stored list of agents,
 * that doesn't include any agent that has been deleted.
 * This function has a constant complexity if no agent were deleted,
 * a linear complexity otherwise.
 */
exports.getAgentsList = () => {
    if (Object.keys(deletedAgents).length > 0) {
        agents = agents.filter(a => !deletedAgents[a.id]);
        deletedAgents = {};
    }
    return agents;
};

/**
 * Set the value of the list of agents
 * This will loop over the entire list to index the agents by id.
 */
exports.setAgentsList = (agentsList) => {
    agents = agentsList;
    agents.forEach(a => { agentsById[a.id] = a; });
};

exports.addAgent = (agent) => {
    logger.info(`Add agent (name=${agent.name}, type=${agent.type})`);
    agents.push(agent);
    agentsById[agent.id] = agent;
};

exports.getHiveMind = () => {
    let hiveMind = null;
    Object.keys(agentsById).forEach(id => {
        if (agentsById[id].type === AT_HIVE_MIND) {
            hiveMind = agentsById[id];
        }
    });
    return hiveMind;
};

/**
 * Remove agent reference from the storage.
 * This means the agent will not be reloaded at the next tick.
 * This function has a constant complexity (not proportional the the number of stored agents).
 * @param {BaseAgent} agent - the agent to remove
 */
exports.removeAgent = (agent) => {
    logger.info(`Remove agent (name=${agent.name}, type=${agent.type})`);
    delete agentsById[agent.id];
    deletedAgents[agent.id] = true;
    allDeletedAgents.add(agent.id);
    deleteAgentState(agent.id);
};

exports.getAgentById = (agentId) => {
    return agentsById[agentId];
};

// FUNCTIONS RELATED TO THE MANAGEMENT OF AGENTS PERSISTENT MEMORY

// default location for agents state, MAY NOT REF TO HOLD ALL AGENTS
Memory.agents = Memory.agents || {};
// maps agent ids to the location where their state can be found.
// THIS WILL HOLD A REF TO ALL EXISTING AGENTS
Memory.agentsMemoryLoc = Memory.agentsMemoryLoc || {};

/**
 * Returns a pointer over the agent state in memory, if there is one.
 * WARNING: the agent state might have been deleted if the agent has been
 * removed from storage.
 * @return {Object} - agent's memory location or `undefined` if the agent has
 *         been deleted from storage
 */
exports.getAgentState = (agentId) => {
    const memLoc = Memory.agentsMemoryLoc[agentId].split('.');
    let memory = Memory;
    for (var i = 0; i < memLoc.length; i++) {
        if (!memory[memLoc[i]]) { return memory; }
        memory = memory[memLoc[i]];
    }
    return memory;
};

/**
 * Returns a pointer over the agent state in memory. If there is none, create one.
 * Beware to not call this function for deleted agents, as it would re-create the
 * otherwise cleared up memory item for this agent.
 * @return {Object} - agent's memory location
 */
exports.getOrCreateAgentState = (agent) => {
    let memory = Memory;
    Memory.agentsMemoryLoc[agent.id] = agent.memoryLocation();
    const memLoc = Memory.agentsMemoryLoc[agent.id].split('.');
    for (var i = 0; i < memLoc.length; i++) {
        if (!memory[memLoc[i]]) {
            logger.debug(`Create state (agentId=${agent.id}, memLoc=${Memory.agentsMemoryLoc[agent.id]})`);
            memory[memLoc[i]] = {};
        }
        memory = memory[memLoc[i]];
    }
    return memory;
};

/**
 * Get rid of any trace of the agent's memory.
 */
const deleteAgentState = (agentId) => {
    if (Memory.agentsMemoryLoc[agentId]) {
        logger.info(`Delete state (agentId=${agentId}, memLoc=${Memory.agentsMemoryLoc[agentId]})`);
        const memLoc = Memory.agentsMemoryLoc[agentId].split('.');
        let memory = Memory;
        delete Memory.agentsMemoryLoc[agentId];

        for (var i = 0; i < memLoc.length - 1; i++) {
            memory = memory[memLoc[i]];
            if (!memory) { break; }  // agent memory is empty

        }
        if (memory) {
            delete memory[memLoc[memLoc.length - 1]];
        }
    }
};
exports.deleteAgentState = deleteAgentState;

/**
 * Returns the list of ids of agents for which we have a saved state
 * We need to return the `agentsList` here, the `Memory.agents` may
 * not hold all ids since some agents can change the memory location
 */
exports.getExistingAgentIds = () => {
    return Object.keys(Memory.agentsMemoryLoc);
};

/**
 * Entirely clears up all agents storage and memory
 * Do not call unless you know what you're doing.
 * Note that module/global variables may not be properly cleared up at the next
 * tick if server node handles the tick.
 */
exports.clearStorage = () => {
    Memory.agents = {};
    Memory.agentsMemoryLoc = {};
    agents = [];
    Memory.profilesCount = {};
    Memory.globalCount = 0;
    Object.keys(agentsById).forEach(k => { delete agentsById[k]; });
    deletedAgents = {};
    logger.warning('/!\\ STORAGE CLEARED /!\\');
};
