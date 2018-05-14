const {
    getAgentById,
} = require('agents.AgentsManager.storage');
const logger = require('log').getLogger('agents.BaseAgent.initialize', '#42D700');

/*
 * Exporting the initialize logic so it can be used in files referenced by BaseAgent
 * Just a break down of a circular dependency.
 * Warning: during creep actor pre-init, may be called with a placeholder agent that
 * has no method.
 */

module.exports = function(agent, name, type, attachedAgentIds, attachedGameObjectIds, {noWarn}={}) {
    logger.info(`Initialize (type=${type} name=${name} attachedAgentIds=${JSON.stringify(attachedAgentIds)} attachedGameObjectIds=${JSON.stringify(attachedGameObjectIds)})`);
    agent.name = name;
    agent.type = type;
    agent.attachedAgentIds = attachedAgentIds || {};
    agent.attachedAgents = {};
    agent.attachedGameObjectIds = attachedGameObjectIds || {};
    agent.attachedGameObjects = {};  // will be refreshed with new game objects after each tick

    Object.keys(agent.attachedAgentIds).forEach(key => {
        agent.attachedAgents[key] = getAgentById(agent.attachedAgentIds[key]);
        if (!agent.attachedAgents[key] && !noWarn) {
            logger.warning(`agent ${name}: Unable to initialize game object under key=${key} (id=${agent.attachedAgentIds[key]})`);
        }
    });

    Object.keys(agent.attachedGameObjectIds).forEach(key => {
        agent.attachedGameObjects[key] = agent.findGameObject
            ? agent.findGameObject(key, agent.attachedGameObjectIds[key])
            : null;
        if (!agent.attachedGameObjects[key] && !noWarn) {
            logger.warning(`agent ${name}: Unable to initialize game object under key=${key} (id=${agent.attachedGameObjectIds[key]})`);
        }
    });

    agent.currentAction = null;
    agent.currentTask = null;
    agent.currentObjective = null;

    agent._tasksList = [];  // list of {taskName, taskParams, priority} objects
};
