const {
    getAgentById,
    addAgent
} = require('agents.AgentsManager.storage');
const tasks = require('tasks');
const objectives = require('objectives');
const genId = require('utils.id');
const logger = require('log').getLogger('agents.BaseAgent', '#42D700');

/**
 * An agent is a long lived object in the AI brain, all attributes are saved in Memory after
 * each tick and restored at the beginning of the next tick.
 * An agent has game objects and other agents attached depending on its type.
 * Game objects and agents are referenced by their id, but instances are fetched
 * An agent may have a action, task and objective assigned which are going to be executed in this order.
 */
class BaseAgent {
    /**
     * Instanciate this agent to a blank state. The agent is not functional at this point,
     * call either `load` to restore an existing state or `initialize` to initialize the agent
     * to a working state,
     * @param {String} id - id of the agent to instanciate, also used to look up existing
     *        state when loading the agent's
     */
    constructor(id) {
        this.id = id || genId();

        this.name = null;
        this.type = null;
        this.attachedAgentIds = {};
        this.attachedGameObjectIds = {};

        this.attachedAgents = {};
        this.attachedGameObjects = {};

        this.currentTask = null;
        this.currentObjective = null;
        this._tasksList = [];
    }

    /**
     * Some agents are actors, i.e. related to specific game objects.
     * Some of these objects are created on demand by other agents.
     * When this happens, an agent is created empty, and 'pre-populated' with
     * the necessary data so it can be reloaded attached to the proper game
     * objects at the next tick, once the actual object has been created.
     * By default, most agents won't need to override this method.
     * Override this method if upon creation and pre-population of the agent,
     * some specific keys of the `attachedGameObjects` method cannot be found
     * by id because they don't have an id yet.
     */
    findGameObject(key, val) {
        return Game.getObjectById(val);
    }

    /**
     * Initialize the agent to a working state
     * (used to create a new agent that doesn't yet have a memory state).
     * This will also register the agent into
     * the agent storage so that subsequent `getAgentById` are able to retrieve the object.
     * @param {String} name - name of this agent
     * @param {CONST} type - agent type (AT_* constant)
     * @param {Object} attachedAgentIds - mapping between strings (keys) and attached agents ids
     * @param {Object} attachedGameObjectIds - mapping between strings keys and game object ids.
     */
    initialize(name, type, attachedAgentIds, attachedGameObjectIds) {
        logger.info(`Initialize (type=${type} name=${name})`);
        this.name = name;
        this.type = type;
        this.attachedAgentIds = attachedAgentIds || {};
        this.attachedAgents = {};
        this.attachedGameObjectIds = attachedGameObjectIds || {};
        this.attachedGameObjects = {};  // will be refreshed with new game objects after each tick

        Object.keys(this.attachedAgentIds).forEach(key => {
            this.attachedAgents[key] = getAgentById(this.attachedAgentIds[key]);
        });

        Object.keys(this.attachedGameObjectIds).forEach(key => {
            this.attachedGameObjects[key] = this.findGameObject(key, this.attachedGameObjectIds[key]);
        });

        this.currentAction = null;
        this.currentTask = null;
        this.currentObjective = null;

        this._tasksList = [];  // list of {taskName, taskParams, priority} objects

        addAgent(this);
    }

    /**
     * Define where the agent should get its memory from,
     * as a key off of the global `Memory` object.
     * This is a convenience for debug purposes, so that e.g creep actor can
     * store its memory in `Memory.creeps[creepName].memory` and ease
     * manual inspection.
     * TODO: implement a way to disable this behavior to reduce the overhead.
     * @return {String} the location where to save and restore memory.
     */
    memoryLocation() {
        return `agents.${this.id}`;
    }

    /**
     * Load the agent state from saved memory. Saved state should have the following format:
     ```
     {
        id: string, name: string. type: string, attachedAgentsIds: Object, attachedGameObjectIds: Object,
        currentAction: {type, params}, currentTask: {type, params}, currentObjective: {type, params}
     }
     ```
     * @param {Object} memory - pointer over a Memory location in which the agent state can be found
     */
    load(memory) {
        logger.debug(`Load (name=${this.name} type=${this.type})`);
        this.name = memory.name;
        this.type = memory.type;

        this.attachedAgentIds = memory.attachedAgentIds;
        this.attachedGameObjectIds = memory.attachedGameObjectIds;

        this.attachedAgents = {};
        this.attachedGameObjects = {};

        Object.keys(this.attachedAgentIds).forEach(key => {
            this.attachedAgents[key] = getAgentById(this.attachedAgentIds[key]);
        });

        Object.keys(this.attachedGameObjectIds).forEach(key => {
            this.attachedGameObjects[key] = this.findGameObject(key, this.attachedGameObjectIds[key]);
        });

        if (memory.currentTask) {
            this.currentTask = new tasks[memory.currentTask.type](memory.currentTask);
        }
        if (memory.currentObjective) {
            this.currentObjective = new objectives[memory.currentObjective.type](memory.currentObjective);
        }
        memory._tasksList.forEach(task => {
            this._tasksList.push(new tasks[task.type](task));
        });
    }

    /**
     * Run the action, task and
     */
    run() {
        if (!this.currentTask && !this.currentObjective && this._tasksList.length == 0) {
            logger.info(`Run Idle (name=${this.name} type=${this.type})`);
            return;
        }
        logger.info(`Run (name=${this.name} type=${this.type})`);
        if (this.currentTask) {
            logger.debug(`Run > Executing Task ${this.currentTask.type} params=${JSON.stringify(this.currentTask.params)} state=${JSON.stringify(this.currentTask.state)}`);
            this.currentTask._execute(this);
            if (this.currentTask._finished(this)) {
                this.currentTask = null;
            }
        }

        if (this.currentObjective) {
            logger.debug(`Run > Executing Objective ${this.currentObjective.type} params=${JSON.stringify(this.currentObjective.params)} state=${JSON.stringify(this.currentObjective.state)}`);
            this.currentObjective._execute(this);
        }

        // pick next task if the current one is done executing
        if (!this.currentTask && this._tasksList && this._tasksList.length > 0) {
            // sort in ascending priority
            this._tasksList.sort((t1, t2) => t1.priority - t2.priority);
            // pop the last item of the list as the  current task
            this.currentTask = this._tasksList.pop();
            logger.debug(`Run > Next task: ${this.currentTask.type}`);
        }

        logger.debug(`Run finished (name=${this.name} type=${this.type})`);
    }

    /*
     * Save the agent state in memory
     * @param {Object} memory - the memory location at which to store the agent state
     */
    save(memory) {
        logger.debug(`Save (name=${this.name} type=${this.type})`);
        memory.id = this.id;
        memory.name = this.name;
        memory.type = this.type;
        memory.attachedAgentIds = this.attachedAgentIds;
        memory.attachedGameObjectIds = this.attachedGameObjectIds;

        if (this.currentTask) {
            memory.currentTask = this.currentTask.dump();
        }
        else {
            memory.currentTask = null;
        }

        if (this.currentObjective) {
            memory.currentObjective = this.currentObjective.dump();
        }
        else {
            memory.currentObjective = null;
        }

        memory._tasksList = this._tasksList.map(t => t.dump());
    }

    /**
     * If an agent is attached to a particular game object that
     * has a limitted lifespan which end up dying, or if it is atteched to
     * a set of such short-lived game objects which all end up dying, it should
     * be removed from its container and memory should be freed to avoid retaining
     * stale information
     */
    isAlive() {
        return true;
    }

    /**
     * Ask the agent whether it is executing a task of the given type
     * or such task is currently scheduled for execution
     * @return {Boolean} - true if the task is found
     */
    hasTaskScheduled(taskType) {
        return (
            (this.currentTask && this.currentTask.type === taskType) ||
            (_.some(this._tasksList.find(t => t.type === taskType)))
        );
    }

    /**
     * Schedule the given task to be executed by the current agent
     * If the agent isn't currently executing a task, it will start executing
     * it immediately (or at the next tick if the creep has already run)
     * @param {BaseTask} task - the task to be executed
     */
    scheduleTask(task) {
        logger.debug(`Schedule task (type=${task.type} params=${JSON.stringify(task.params)} state=${JSON.stringify(task.state)})`);
        if (this.currentTask === null) {
            this.currentTask = task;
        }
        else {
            this._tasksList.push(task);
        }
    }

    /**
     * Change the current objective of the agent.
     * @param {BaseObjective} objective - the objective to be executed
     */
    setObjective(objective) {
        logger.debug(`Set objective (type=${objective.type} params=${JSON.stringify(objective.params)} state=${JSON.stringify(objective.state)})`);
        this.currentObjective = objective;
    }

    /**
     * Attach the given agent to the current agent.
     * This will make sure that the agent is attached in a way that the link
     * will be properly saved in memory.
     * @param {String} key - key under which to store this agent in `attachedAgents`
     *                 if the key already exists, it will be overrided
     * @param {BaseAgent} agent - the agent instance to attach
     */
    attachAgent(key, agent) {
        this.attachedAgents[key] = agent;
        this.attachedAgentIds[key] = agent.id;
    }

    /**
     * Retrieve an attached agent
     */
    agent(key) {
        return this.attachedAgents[key];
    }

    /**
     * Retrieve an attached object
     */
    object(key) {
        return this.attachedGameObjects[key];
    }

    /**
     * Handle the creation of a new agent, called by the agents manager
     * when a pending agent has its game object created.
     * This function does nothing by default. This will make the agent orphan,
     * not attached to any other agent.
     * Override to attach the given agent to some key of the current agent.
     * @param {BaseAgent} agent - the created agent to handle
     */
    handleNewAgent(/*agent*/) { }
}

module.exports = BaseAgent;
