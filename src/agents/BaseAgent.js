const {
    getAgentById,
    addAgent,
    hasAgentBeenDeleted,
    hasAnyAgentBeenDeleted
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
        logger.info(`Initialize (type=${type} name=${name} attachedAgentIds=${JSON.stringify(attachedAgentIds)} attachedGameObjectIds=${JSON.stringify(attachedGameObjectIds)})`);
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
        logger.debug(`Load (name=${memory.name} type=${memory.type})`);
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
        else {
            this.currentTask = null;
        }
        if (memory.currentObjective) {
            this.currentObjective = new objectives[memory.currentObjective.type](memory.currentObjective);
        }
        else {
            this.currentObjective = null;
        }

        this._tasksList = [];
        memory._tasksList.forEach(task => {
            this._tasksList.push(new tasks[task.type](task));
        });
    }

    /**
     * Called  upon deletion of an attached agent, detected at the beginning of the
     * run function.
     */
    notifyDeletedAgent(agent, key) {
        logger.info(`${this.name} noticed death of attached ${key}: ${agent.name}`);
    }

    /**
     * Called upon starting the execution of a new task.
     */
    notifyNewTask(task) {
        logger.debug(`Run > Next task: ${task.type}`);
    }

    notifyTaskFinished(task) {
        logger.info(
            `[${this.name}] Task execution finished (type=` +
            `${task.type} params=${JSON.stringify(task.params)} ` +
            `state=${JSON.stringify(task.state)}`);

    }

    /**
     * Run the current task, the current objective, and pop the next task
     * from the task list if the current task is finished.
     */
    run() {
        if (hasAnyAgentBeenDeleted()) {
            // check that we don't have any attached agent deleted in the current tick
            // TODO: better yet would be to link all agents both ways, so we know the
            // list of agents a given agent is attached to and can clean that up
            // upon removal directly.
            Object.keys(this.attachedAgentIds).forEach(k => {
                const id = this.attachedAgentIds[k];
                if (hasAgentBeenDeleted(id)) {
                    this.notifyDeletedAgent(this.attachedAgents[k], k);
                    if (this.attachedAgentIds[k]) {
                        delete this.attachedAgentIds[k];
                    }
                    if (this.attachedAgents[k]) {
                        delete this.attachedAgents[k];
                    }
                }
            });
        }

        if (!this.currentTask && !this.currentObjective && this._tasksList.length == 0) {
            logger.debug(`Run Idle (name=${this.name} type=${this.type})`);
            return;
        }

        logger.debug(`Run (name=${this.name} type=${this.type})`);
        if (this.currentTask) {
            logger.debug(`Run > Executing Task ${this.currentTask.type} params=${JSON.stringify(this.currentTask.params)} state=${JSON.stringify(this.currentTask.state)}`);
            this.currentTask._execute(this);
            if (this.currentTask._finished(this)) {
                this.notifyTaskFinished(this.currentTask);
                this.currentTask = null;
            }
        }

        if (this.currentObjective) {
            logger.debug(`Run > Executing Objective ${this.currentObjective.type} params=${JSON.stringify(this.currentObjective.params)} state=${JSON.stringify(this.currentObjective.state)}`);
            this.currentObjective._execute(this);
        }

        // pick next task if the current one is done executing
        if (!this.currentTask && this._tasksList && this._tasksList.length > 0) {
            // sort in descending priority
            this._tasksList.sort((t1, t2) => t2.priority - t1.priority);
            // grab the first item of the list as the current task (highest priority)
            // if all tasks have the same priority, in-place sorting should leave the
            // first item that was pushed to the list come out.
            this.currentTask = this._tasksList.shift();
            this.notifyNewTask(this.currentTask);
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
     * If no task type is specified, this returns whether the agent currently
     * has *any* task scheduled.
     * @param {CONST} taskType - specific type of the task to look for
     * @param {Object} options
     * @param {Function} filter - a filter function to apply to task instances,
     *                   this function will ignore any task for which this function returns false.
     * @return {Boolean} - true if the task is found
     */
    hasTaskScheduled(taskType, {filter}={}) {
        return (
            (
                this.currentTask &&
                (!taskType || this.currentTask.type === taskType) &&
                (!filter || filter(this.currentTask))
            ) ||
            (
                _.some(this._tasksList.find(
                    t => t.type === taskType && (!filter || filter(t))))
            )
        );
    }

    /**
     * Ask the agent the number of task it currently has scheduled
     * This include the task the agent is currently executing
     * @param {String} taskType - filter the type of task.
     * @return {Integer} - the number of scheduled and executing tasks, or
     *                   the number of tasks of the given type.
     */
    nbTasksScheduled(taskType) {
        let allTasks = Array.from(this._tasksList);
        if (this.currentTask) {
            allTasks = allTasks.concat([this.currentTask]);
        }
        if (taskType) {
            allTasks = allTasks.filter(t => t.type === taskType);
        }
        return allTasks.length;
    }

    /**
     * Execute a custom function for each task being executed or scheduled
     * for execution.
     * @param {Function} fn - the function to execute, the task object will be
     *                        given as sole argument.
     */
    forEachScheduledTask(fn) {
        if (this.currentTask) {
            fn(this.currentTask);
        }
        this._tasksList.forEach(fn);
    }

    notifyTaskScheduled(task) {
        logger.info(
            `[${this.name}] schedule task (type=${task.type} params=` +
            `${JSON.stringify(task.params)} state=${JSON.stringify(task.state)})`);

    }

    /**
     * Schedule the given task to be executed by the current agent
     * If the agent isn't currently executing a task, it will start executing
     * it immediately (or at the next tick if the creep has already run)
     * @param {BaseTask} task - the task to be executed
     */
    scheduleTask(task) {
        if (task.applicableAgentType !== this.type) {
            logger.warning(
                `Scheduling task with non-applicable agent type ${task.applicableAgentType} ` +
                `to agent ${this.name} of type: ${this.type}`);
            debugger;  // eslint-disable-line no-debugger
        }
        this.notifyTaskScheduled(task);
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
        logger.info(
            `[${this.name}] Set objective (type=${objective.type} params=` +
            `${JSON.stringify(objective.params)} state=${JSON.stringify(objective.state)})`);
        this.currentObjective = objective;
    }

    /**
     * Check whether the agent has the given objective.
     * @param {String} objectiveType - the type of the objective to check
     * @return {Boolean} - if `objectiveType` is specified, this will only return
     *                     true if the given type of objective is currently active.
     *                    Otherwise, it returns true if *any* objective is active
     */
    hasObjective(objectiveType) {
        return this.currentObjective && (
            objectiveType === undefined ||
            objectiveType === this.currentObjective);
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
