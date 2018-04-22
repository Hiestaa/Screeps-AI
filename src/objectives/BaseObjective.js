const logger = require('log').getLogger('objectives.BaseObjective', '#FFF000');

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
class BaseObjective {
    /**
     * Initialize the objective
     * BaseObjective is an interface and should not be instanciated directly.
     * @param {CONST} type - type of this objective (O_*, A_* or T_* constant)
     *                       This MUST be DEFINED by a sub-class.
     * @param {CONST} applicableAgentType - type of agent able to execute this objective
     *                this determine the types of assumptions made in the execution
     *                of this objective related to the agent executing it.
     *                This MUST be DEFINED by a sub-class
     * @param {Object} memory - stored memory, or provided bootstrap memory
     *                 this MUST be provided when INSTANCIATING or RELOADING the objective.
     * @param {Object} [memory.params] - parameters for this objective, beware that
                       some objectives might have some required parameters
     * @param {Object} [memory.state] - the state of this objective, if the objective has
     *                 already been started.
     */
    constructor(type, applicableAgentType, {params, state}) {
        logger.debug(`Constructing (type=${type} params=${JSON.stringify(params)} state=${JSON.stringify(state)})`);
        this.type = type;
        this.applicableAgentType = applicableAgentType;
        this._agentTypeError = false;
        this.params = params || {};
        this.state = state || {};
    }

    execute() {
        throw new Error(`Not Implemented - ${this.type}.execute`);
    }

    /**
     * Make the agent execute the objective, if it has the applicable type.
     * @param {Agent} agent - the agent that should execute this objective.
     *                The agent should have the applicable type, but does not need to be
     *                the same at each turn, although most objectives are implemented that a
     *                single agent will execute them all the way through.
     */
    _execute(agent) {
        if (this._agentTypeError) { return; }
        if (agent.type !== this.applicableAgentType) {
            logger.error(`Unapplicable agent type (type=${this.type}, ` +
                         `type=${agent.type}, applicable=${this.applicableAgentType})`);
            this._agentTypeError = true;
            return;
        }
        this.execute(agent);
    }

    /**
     * Dump the data required to rebuild the this objective at the next tick.
     * This data will be saved to memory, so be conservative about what's in there.
     */
    dump() {
        return {
            type: this.type,
            // this doesn't need to be saved in memory
            // upon instanciating the objective, this will be provided by the
            // sub-class as a constant.
            // applicableAgentType: this.applicableAgentType,
            params: this.params,
            state: this.state
        };
    }

}

module.exports = BaseObjective;
