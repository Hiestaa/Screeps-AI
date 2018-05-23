const {
    getAgentById,
    hasAgentBeenDeleted,
    addAgent,
    deleteAgentState,
    hasAnyAgentBeenDeleted
} = require('agents.AgentsManager.storage');
const baseAgentSave = require('agents.BaseAgent.save');
const baseAgentInitialize = require('agents.BaseAgent.initialize');
const tasks = require('tasks');
const objectives = require('objectives');
const genId = require('utils.id');
let logger = require('log').getLogger('agents.BaseAgent.index', '#42D700');

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
    initialize(name, type, attachedAgentIds, attachedGameObjectIds, {noWarn}={}) {
        baseAgentInitialize(this, name, type, attachedAgentIds, attachedGameObjectIds, {noWarn});
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
            if (!this.attachedAgents[key]) {
                logger.warning(`${this.name}: Unable to load attached game object under key ` +
                               `${key}[id=${this.attachedAgentIds[key]}]`);
                delete this.attachedAgents[key];
                delete this.attachedAgentIds[key];
            }

        });

        Object.keys(this.attachedGameObjectIds).forEach(key => {
            this.attachedGameObjects[key] = this.findGameObject(key, this.attachedGameObjectIds[key]);
            if (!this.attachedGameObjects[key]) {
                logger.warning(`${this.name}: Unable to load attached game object under key ` +
                               `${key}[id=${this.attachedGameObjectIds[key]}]`);
                delete this.attachedGameObjects[key];
                delete this.attachedGameObjectIds[key];
            }
        });

        if (memory.currentTask && tasks[memory.currentTask.type]) {
            this.currentTask = new tasks[memory.currentTask.type](memory.currentTask);
        }
        else if (memory.currentTask) {
            this.currentTask = null;
            logger.error(`Class for objective ${memory.currentTask.type} does not exist`);
            // throw new Error(`Class for objective ${memory.currentTask.type} does not exist`);
        }
        else {
            this.currentTask = null;
        }
        if (memory.currentObjective && objectives[memory.currentObjective.type]) {
            this.currentObjective = new objectives[memory.currentObjective.type](memory.currentObjective);
        }
        else if (memory.currentObjective) {
            this.currentObjective = null;
            logger.error(`Class for objective ${memory.currentObjective.type} does not exist`);
            // throw new Error(`Class for objective ${memory.currentObjective.type} does not exist`);
        }
        else {
            this.currentObjective = null;
        }

        this._tasksList = [];
        (memory._tasksList || []).forEach(task => {
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
                    deleteAgentState(id);
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
            try {
                this.currentTask._execute(this);
                if (this.currentTask._finished(this)) {
                    this.notifyTaskFinished(this.currentTask);
                    this.currentTask = null;
                }
            }
            catch (e) {
                logger.error(`Unable to execute ${this.currentTask.type} (params=${JSON.stringify(this.currentTask.params)}, state=${JSON.stringify(this.currentTask.state)}):`);
                logger.error(`${e.message}\n${e.stack}`);
                logger.error('Considering task finished.');
                this.notifyTaskFinished(this.currentTask);
                this.currentTask = null;
            }
        }

        if (this.currentObjective) {
            logger.debug(`Run > Executing Objective ${this.currentObjective.type} params=${JSON.stringify(this.currentObjective.params)} state=${JSON.stringify(this.currentObjective.state)}`);
            try {
                this.currentObjective._execute(this);
            }
            catch (e) {
                logger.error(`Unable to execute ${this.currentObjective.type} (params=${JSON.stringify(this.currentObjective.params)}, state=${JSON.stringify(this.currentObjective.state)}):`);
                logger.error(`${e.message}\n${e.stack}`);
                logger.error('Discarding objective.');
                this.currentObjective = null;
            }
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
        baseAgentSave(this, memory);
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
     * Get the scheduled or currently executing task of the given type
     * @param {CONST} taskType - specific type of the task to look for
     * @param {Object} options
     * @param {Function} filter - a filter function to apply to task instances,
     *                   this function will ignore any task for which this function returns false.
     * @return {BaseTask} - Task instance or null if no matching task can be found
     */
    getScheduledTask(taskType, {filter}={}) {
        if (this.currentTask && this.currentTask.type === taskType && (!filter || filter(this.currentTask))) {
            return this.currentTask;
        }
        if (this._tasksList.length > 0) {
            for (var i = 0; i < this._tasksList.length; i++) {
                if (this._tasksList[i] &&
                    this._tasksList[i].type === taskType &&
                    (!filter || filter(this._tasksList[i]))) {
                    return this._tasksList[i];
                }
            }
        }

        return null;
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
            objectiveType === this.currentObjective.type);
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
     * Attach the given object to the current agent.
     * This will make sure the object is attached in a way that the link with
     * the agent will be properly saved in memory
     * @param {String} key - key under which to store this agent in `attachedGameObjects`
                       if the key already exists, it will be overrided
     * @param {GameObject} object - the object to attach. It should have an id and
     *                     should be retrieveable via `Game.getObjectById()`.
     */
    attachObject(key, object) {
        this.attachedGameObjects[key] = object;
        this.attachedGameObjectIds[key] = object.id;
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
