// This module is decoupled from the storage part, so that agent classes can refer
// to the `storage` part of the agent manager without creating a circular dependency
// with the `run` part which depends on the agent classes to run them.

const {
    getAgentsList,
    setAgentsList,
    removeAgent,
    getAgentState,
    getOrCreateAgentState,
    deleteAgentState,
    getExistingAgentIds,
    addAgent
} = require('agents.AgentsManager.storage');
const {
    verifyPendingAgents
} = require('agents.AgentsManager.build');
const HiveMind = require('agents.HiveMind');

const agentClasses = require('agents');

/**
 * Run for one tick.
 * This will load each agent state from memory, run each agent execution function, and
 * save each agent state into memory before returning.
 * If an agent execution triggers a call to `addAgent`, the new agent will be added
 * to the list of agents managed.
 */
module.exports = () => {
    // first recreate all the agents. We can't trust that the previous tick
    // was run on the same node so we gotta reload the whole bunch
    const agents = getExistingAgentIds().map(agentId => {
        const agentState = getAgentState(agentId);
        const instance = new agentClasses[agentState.type](agentId);
        return instance;
    });

    // commit the agents list to storage before we attempt to load their state
    // this is necessary for the agent load function to be able to query
    // other agents by id
    setAgentsList(agents);

    // If we don't have any agent, nothing will happen
    // In this case, create and initialize the Hive Mind, which will create the
    // initial tree of agents,
    if (agents.length === 0) {
        const hiveMind = new HiveMind();
        hiveMind.initialize();
        // add the agent to the list of managed agents so it can be saved
        // and reloaded at the next tick
        addAgent(hiveMind);
    }

    // then reload each instance. We have to have all the agents instanciated
    // in case the load function requires to load an existing agent by id.
    getAgentsList().forEach(agent => {
        agent.load(getAgentState(agent.id));
    });

    // verify that we haven't any pending new agent.
    // if we do, we need to get the agent created and initialized after the load
    // of other agents (so the agent that will handle the created one can behave
    // properly) but before we execute any, so the agent get added to the storage
    // and executed at this tick.
    verifyPendingAgents();

    // now verify that each agent is still alive, this needs to be done after
    // reloading the agent's state otherwise it won't be able to know whether
    // it is alive or not
    getAgentsList().forEach((agent, idx) => {
        // if the agent isn't alive, this means the agent should be destroyed
        if (!agent.isAlive()) {
            removeAgent(agent.id);
        }
        else {
            deleteAgentState(agent.id);
        }
    })

    // then run the agent execution function, one at a time.
    // TODO: since execution of the agent can lead to the creation of other agent,
    // and the `forEach` function will ignore any item added after it is called,
    // we could speed up some processes by making the storage `addAgent`
    // (would be better named `buildAgent` or smth) save that in a separate list,
    // which we could process during the current tick.
    // Beware then to not include agent creation associated with an update of
    // the game state, since these will only exist one or several ticks later on.
    getAgentsList().forEach(agent => {
        agent.run();
    });

    // only then, reprocess and save the full list.
    // Some agents may have been created and may not have had
    // a chance to execute their function at this run.
    // save them, so they will get loaded with the rest at a later tick.
    getAgentsList().forEach(agent => {
        // if we don't have an agent state at this point, it means the agent was
        // created during this turn. Create a memory spot for him.
        // If an agent was removed during this tick, it should not appear
        // in the returned list from `getAgentsList()`
        const agentState = getOrCreateAgentState(agentId, agent);
        // save whether alive or not - an new actor that triggers the creation
        // of its game object will not have this game object created
        // (and thus technically alive) until the beginning of the next tick.
        // It will be deleted then if the object creation failed.
        agent.save(agentState);
    })
};
