const BaseCreepAction = require('tasks.creepActions.BaseCreepAction');
const {
    A_MOVE,
    CP_WORKER,
    CP_HAULER,
    CP_FIGHTER,
    CP_RANGED_FIGHTER,
    CP_HEALER,
    CP_CLAIM
} = require('constants');


/**
 * Basic move action, doesn't do anything else than going straight to the defined
 * target position. This does not support moving out of the current room
 */
class Move extends BaseCreepAction {
    /**
     * Create or reload a Move action.
     * @param {Float} [memory.priority] - priority for this action, used by the agent to control
     *                the execution order of his action.
     *                this MUST be provided when INSTANCIATING or RELOADING the objective.
     * @param {Object} memory.params - parameters for this objective, beware that
                       some objectives might have some required parameters
     * @param {Object} memory.params.target - {x, y} object describing where to move to
     * @param {ObjectId} memory.params.targetId - id of the object towards which to move to
     *                   at least one of target or targetId must be specified
     * @param {Integer} memory.params.distanceFrom - a distance from which the creep
     *                  should remain from the target. Allow to have the task
     *                  completed a bit earlier than the moment it actually reach the
     *                  target.
     * @param {Object} [memory.state] - the state of this objective, if the objective has
     *                 already been started.
     */
    constructor({priority, params: {targetId, target, distanceFrom}, state}) {
        super(new Set([
            CP_WORKER,
            CP_HAULER,
            CP_FIGHTER,
            CP_RANGED_FIGHTER,
            CP_HEALER,
            CP_CLAIM
        ]), A_MOVE, {
            params: {targetId, target, distanceFrom: distanceFrom || 0},
            state,
            priority
        });
    }

    execute(creepActor) {
        super.execute(creepActor);
        const creep = creepActor.object('creep');
        if (this.params.targetId) {
            const target = Game.getObjectById(this.params.targetId);
            creep.moveTo(target, {visualizePathStyle: {stroke: '#ffffff'}});
        }
        else if (this.params.target) {
            const target = this.params.target;
            creep.moveTo(target.x, target.y, {visualizePathStyle: {stroke: '#ffffff'}});
        }
    }

    /**
     * A creep is finished upgrading when the target is at range from the defined target.
     * By default, the range is 0, meaning that the target is reached
     * @param {CreepActor} creepActor - creep actor executing the action
     */
    finished(creepActor) {
        if (this.params.target) {
            const pos = creepActor.object('creep').pos;
            if (this.params.distanceFrom > 0) {
                return pos.inRangeTo(this.params.target.x, this.params.target.y, this.params.distanceFrom);
            }
            return pos.x === this.params.target.x && pos.y === this.params.target.y;
        }
        else if (this.params.targetId) {
            const target = Game.getObjectById(this.params.targetId);
            const pos = creepActor.object('creep').pos;
            if (this.params.distanceFrom > 0) {
                return pos.inRangeTo(target, this.params.distanceFrom);
            }
            else {
                return pos.x === target.pos.x && pos.y === target.pos.y;
            }
        }
        else {
            return true;
        }
    }

    shortDescription() {
        if (this.params.target) {
            return `🚗${this.params.target.x}, ${this.params.target.y}`;
        }
        else if (this.params.targetId) {
            return `🚗${this.params.targetId.slice(0, 3)}`;
        }
        else {
            return '🚗';
        }
    }

}

module.exports = Move;
