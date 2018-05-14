/*
 * Exporting the save logic so it can be used in files referenced by BaseAgent
 * Just oa break down of a circular dependency.
 */

module.exports = function(agent, memory) {
    memory.id = agent.id;
    memory.name = agent.name;
    memory.type = agent.type;
    memory.attachedAgentIds = agent.attachedAgentIds;
    memory.attachedGameObjectIds = agent.attachedGameObjectIds;

    if (agent.currentTask) {
        memory.currentTask = agent.currentTask.dump();
    }
    else {
        memory.currentTask = null;
    }

    if (agent.currentObjective) {
        memory.currentObjective = agent.currentObjective.dump();
    }
    else {
        memory.currentObjective = null;
    }

    memory._tasksList = agent._tasksList.map(t => t.dump());
};
