// FUNCTIONS RELATED TO THE MANAGEMENT OF AGENT INSTANCES (in module memory)

const agents = [];
const agentsById = {};
// saves which agents are deleted
// (saves running over the entire list of agents when deleting one)
// (this doesn't need to be remembered accross ticks)
const deletedAgents = {};

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
}

/**
 * Set the value of the list of agents
 * This will loop over the entire list to index the agents by id.
 */
exports.setAgentsList = (agentsList) => {
    agents = agentsList;
    agents.forEach(a => { agents[a.id] = a; });
}

exports.getAgentsMap = () => {
    return agentsById;
}

exports.addAgent = (agent) => {
    agents.push(agent);
    agentsById[agent.id] = agent;
}


/**
 * Remove agent reference from the storage.
 * This means the agent will not be reloaded at the next tick.
 * This function has a constant complexity (not proportional the the number of stored agents).
 * @param {BaseAgent} agent - the agent to remove
 */
exports.removeAgent = (agent) => {
    delete agentsById[agent.id];
    deletedAgents[agent.id] = true;
    deleteAgentState(agent.id);
}

exports.getAgentById = (agentId) => {
    return agentsById[agent.id];
}

// FUNCTIONS RELATED TO THE MANAGEMENT OF AGENTS PERSISTENT MEMORY
Memory.agents = Memory.agents || {};  // default location for agents state
// maps agent ids to the location where their state can be found.
Memory.agentsList = Memory.agentsList || {};

/**
 * Returns a pointer over the agent state in memory, if there is one.
 * WARNING: the agent state might have been deleted if the agent has been
 * removed from storage.
 * @return {Object} - agent's memory location or `undefined` if the agent has
 *         been deleted from storage
 */
exports.getAgentState = (agentId) => {
    const memLoc = Memory.agentsList[agentId].split('.');
    let memory = Memory;
    for (var i = 0; i < memLoc.length; i++) {
        if (memory) { return memory; }
        memory = memory[memLoc[i]];
    }
    return memory;
}

/**
 * Returns a pointer over the agent state in memory. If there is none, create one.
 * Beware to not call this function for deleted agents, as it would re-create the
 * otherwise cleared up memory item for this agent.
 * @return {Object} - agent's memory location
 */
exports.getOrCreateAgentState = (agentId, agent) => {
    let memory = Memory;
    Memory.agentsList[agentId] = agent.memoryLocation();
    const memLoc = Memory.agentsList[agentId].split('.');
    for (var i = 0; i < memLoc.length; i++) {
        if (!memory[memLoc[i]]) { memory[memLoc[i]] = {}; }
        memory = memory[memLoc[i]];
    }
    return memory;
}

/**
 * Get rid of any trace of the agent's memory.
 */
exports.deleteAgentState = (agentId) => {
    if (Memory.agentsList[agentId]) {
        const memLoc = Memory.agentsList[agentId].split();
        delete Memory.agentsList[agentId];

        for (var i = 0; i < memLoc.length; i++) {
            if (!memory) { break; }  // agent memory is empty
            if (i === memLoc.length - 1) {
                delete memory[memLoc[i]];
            }
            memory = memory[memLoc[i]];
        }
    }
}

/**
 * Returns the list of ids of agents for which we have a saved state
 */
exports.getExistingAgentIds = () => {
    return Object.keys(Memory.agentsList);
}

