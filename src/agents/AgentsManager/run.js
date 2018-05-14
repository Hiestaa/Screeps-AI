// This module is decoupled from the storage part, so that agent classes can refer
// to the `storage` part of the agent manager without creating a circular dependency
// with the `run` part which depends on the agent classes to run them.
const {
    AT_CREEP_ACTOR
} = require('constants');
const {
    getAgentsList,
    setAgentsList,
    removeAgent,
    getAgentState,
    getOrCreateAgentState,
    getExistingAgentIds,
    addAgent,
    getAgentById
} = require('agents.AgentsManager.storage');
const {
    forEachPendingAgents
} = require('agents.AgentsManager.build');
const HiveMind = require('agents.HiveMind');
const GetFactionStarted = require('tasks.hiveMind.GetFactionStarted');
const agentClasses = require('agents');
const CreepActor = require('agents.CreepActor');
const logger = require('log').getLogger('agents.AgentsManager.run', '#FC00FF');

Memory.pause = Memory.pause || false;

/**
 * Verify if any of the pending new agent is ready for creation.
 * If so, build the agent and add it to the agents list,
 * retrieve the agent that should handle the creation, call into its
 * `handleNewAgent` function, then remove the agent from the pending new agents.
 */
function verifyPendingAgents() {
    forEachPendingAgents(({type, id, handlerId, profile}) => {
        if (type === AT_CREEP_ACTOR) {
            // creeps are id'ed by name in this array
            const creep = Game.creeps[id];
            if (!creep) { return false; }   // creep doesn't exist yet
            // creep isn't alive yet
            if (!(creep.hits > 0 && creep.ticksToLive > 0)) { return false; }

            const agent = getAgentById(handlerId);
            if (!agent) {
                logger.error(`Couldn't find pending agent handler ${handlerId}`);
                return true;
            }

            // creep actors should be pre-initialized, so their memory should already be set
            // we just need to reload them/
            // perform regular initialization if the memory doesn't exist, or doesn't have any key
            const creepActor = new CreepActor();
            if (creep.memory && Object.keys(creep.memory).length > 0) {
                logger.info(`Loading pre-initialized creep ${creep.memory.name} ` +
                            `from memory: ${JSON.stringify(creep.memory)}`);
                creepActor.load(creep.memory);
                addAgent(creepActor);  // pre-initialized actors are not added to the storage yet
            } else {
                logger.info(`Initializing new creep actor ${creep.name}`);
                creepActor.initialize(creep, profile);
                // pre-save just in case something wrong happens before the save phase of this tick
                creepActor.save(creep.memory);
            }

            // TF??
            if (!creepActor.isAlive()) {
                logger.error(`Creep ${creepActor.name} is dead on birth`);
                removeAgent(creepActor);
                return false;
            }

            logger.info(`Assigning new creep actor ${creepActor.name} to agent ${agent.name}`);
            agent.handleNewAgent(creepActor);
            return true;
        }
        else {
            logger.error(
                'Dont\'t know what to do with pending agent type: ' + type);
            return true;  // don't error at each call...
        }
    });

    // TODO: also consider all items in `Game.creeps` which may not have any memory, for some reason.
}

/**
 * Run for one tick.
 * This will load each agent state from memory, run each agent execution function, and
 * save each agent state into memory before returning.
 * If an agent execution triggers a call to `addAgent`, the new agent will be added
 * to the list of agents managed.
 */
module.exports = () => {
    if (Memory.pause) {
        logger.info('Run Paused. Run `cli.resume()` to resume.');
        return;
    }
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

    // then reload each instance. We have to have all the agents instanciated
    // in case the load function requires to load an existing agent by id.
    getAgentsList().forEach(agent => {
        agent.load(getAgentState(agent.id));
    });

    // If we don't have any agent, nothing will happen
    // In this case, create and initialize the Hive Mind, which will create the
    // initial tree of agents. Initialized agents should be in a working state
    // and should not need loading for this tick.
    if (agents.length === 0) {
        const hiveMind = new HiveMind();
        hiveMind.initialize();
        // add the agent to the list of managed agents so it can be saved
        // and reloaded at the next tick
        addAgent(hiveMind);

        // schedule the 'GET_FACTION_STARTED' task on the hive-mind
        // TODO: if we ever want to have another task assigen to the hive mind,
        // we probably should assign some kind of generic objective that
        // does nothing but check the conditions for scheduling future hive-mind tasks
        // same could apply to the colony
        hiveMind.scheduleTask(new GetFactionStarted());
    }
    // verify that we haven't any pending new agent.
    // if we do, we need to get the agent created and initialized after the load
    // of other agents (so the agent that will handle the created one can behave
    // properly) but before we execute any, so the agent get added to the storage
    // and executed at this tick.
    verifyPendingAgents();

    // now verify that each agent is still alive, this needs to be done after
    // reloading the agent's state otherwise it won't be able to know whether
    // it is alive or not
    getAgentsList().forEach((agent) => {
        // if the agent isn't alive, this means the agent should be destroyed
        if (!agent.isAlive()) {
            removeAgent(agent);
        }
    });

    // then run the agent execution function, one at a time.
    // TODO: the agent's execution function may not terminate the list of actions
    // the agent is allowed to perform. We should find a way to keep running the
    // agents until it is blocked by a game action, or it doesn't know what to do
    // anymore.
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
        const agentState = getOrCreateAgentState(agent);
        // save whether alive or not - an new actor that triggers the creation
        // of its game object will not have this game object created
        // (and thus technically alive) until the beginning of the next tick.
        // It will be deleted then if the object creation failed.
        agent.save(agentState);
    });
};

module.exports.suspend = () => {
    Memory.pause = true;
};

module.exports.resume = () => {
    Memory.pause = false;
};
