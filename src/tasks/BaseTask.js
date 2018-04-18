const BaseObjective = require('objectives.BaseObjective');


/**
 * Coordination of various agents is made throught tasks and objectives.
 * Objectives have a type a type and applicable agent type that should be fixed
 * in sub-classes (it should be a class variable, not an object member).
 * They also have parameters that will be retained with the instance and
 * a state object. They will both be saved in Memory and reloaded at the
 * beginning of each tick.
 * Finally, they have an `execute` and `isFinish` function which should be
 * implemented in the subclasses to define their behavior.
 * Tasks derive from objectives, in that they have a termination criteria
 * and a priority level.
 * An agent always manages an objective and a list of tasks ordered by priority.
 * Agent tasks and objective can be modified by himself or any agent that has a
 * higher hierarchical type than the current one.
 * Agents will execute the task that is the most urgent to completion before
 * picking the next most urgent task from the task queue (if there is any).
 * At each time step, the agent first executes its current task, then its current
 * objective (which may or may not add tasks to the tasks list) and then,
 * if the current task is completed, will pop the most urgent task from
 * the list and make it its current one.
 */
class BaseTask extends BaseObjective {
    /**
     * Initialize the task
     * BaseTask is an interface and should not be instanciated directly.
     * @param {CONST} type - type of this task (A_* or T_* constant)
     *                This MUST be DEFINED by a sub-class
     * @param {CONST} applicableAgentType - type of agent able to execute this task
     *                this determine the types of assumptions made in the execution
     *                of this task related to the agent executing it.
     *                This MUST be DEFINED by a sub-class
     * @param {Object} memory - stored memory, or provided bootstrap memory
     *                 this MUST be provided when INSTANCIATING or RELOADING the task.
     * @param {Object} [memory.params] - parameters for this task, beware that
                       some tasks might have some required parameters
     * @param {Object} [memory.state] - the state of this task, if the task has
     *                 already been started.
     * @param {Float} [memory.priority] - priority for this task, used by the agent to control
     *                the execution order of his task.
     */
    constructor(type, applicableAgentType, {state, params, priority}) {
        super(type, applicableAgentType, {state, params});
        this.priority = priority || 1.0;
    }

    _log(msg) { console.log(`[BASE TASK]${msg}`); }

    /**
     * Make the agent execute the task, if it has the applicable type.
     * @param {Agent} agent - the agent that should execute this task.
     *                The agent should have the applicable type, but does not need to be
     *                the same at each turn, although most tasks are implemented that a
     *                single agent will execute them all the way through.
     */
    execute(agent) {
        throw new Error(`Not Implemented - ${name}._execute`);
    }

    /**
     * Tasks are one-shot actions by default.
     * Override to set a terminating condition that isn't always true.
     * @param {BaseAgent} agent - agent who executed the task.
     */
    finished(agent) {
        return true;
    }

    /**
     * Tell whether the task managed to finish its execution.
     * @return {Boolean} - true if the task should not be executed anymore
     */
    _finished(agent) {
        if (this._agentTypeError) { return true; }
        return this._finished();
    }

    dump() {
        const data = super();
        data.priority = this.priority;
    }
}

module.exports = BaseAction;
