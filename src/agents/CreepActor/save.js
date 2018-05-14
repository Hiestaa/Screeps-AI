const baseAgentSave = require('agents.BaseAgent.save');

module.exports = function(agent, state) {
    baseAgentSave(agent, state);
    state.creepProfile = agent.creepProfile;
};
