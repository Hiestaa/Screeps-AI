const BaseCreepAction = require('tasks.creepActions.BaseCreepAction');
const {
    A_RANGED_ATTACK,
    CP_RANGED_FIGHTER,
} = require('constants');
const logger = require('log').getLogger('tasks.creepActions.RangedAttack', 'white');

const ATTACK_RANGE = 3;

/**
 * Simple kiting and ranged attack action.
 * The creep moves towards the target, attack, then moves back to avoid enemy
 * fire.
 * The action does not yet back off on enemy fire, and does not pay attention
 * to any other creep or structure than the one defined as the target.
 */
class RangedAttack extends BaseCreepAction {
    /**
     * Create or reload a RangedAttack action.
     * @param {Float} [memory.priority] - priority for this action, used by the agent to control
     *                the execution order of his action.
     *                this MUST be provided when INSTANCIATING or RELOADING the objective.
     * @param {Object} memory.params - parameters for this objective, beware that
                       some objectives might have some required parameters
     * @param {ObjectId} memory.params.targetId - id of the object that should be attacked
     * @param {Object} [memory.state] - the state of this objective, if the objective has
     *                 already been started.
     */
    constructor({priority, params: {targetId}, state}) {
        super(new Set([
            CP_RANGED_FIGHTER,
        ]), A_RANGED_ATTACK, {
            params: {targetId},
            state,
            priority
        });
    }

    execute(creepActor) {
        debugger; // eslint-disable-line no-debugger
        super.execute(creepActor);
        const creep = creepActor.object('creep');
        const target = Game.getObjectById(this.params.targetId);

        // if the creep is just one off of the range of the target, we can move
        // and attack at the same turn.
        if (creep.pos.inRangeTo(target.pos, ATTACK_RANGE + 1) &&
            !creep.pos.inRangeTo(target.pos, ATTACK_RANGE)) {
            const code = creep.moveTo(target,  {visualizePathStyle: {stroke: '#ff0000'}});
            if (code !== OK) {
                logger.failure(code, `Couldn't move towards target: [${target.pos.x}, ${target.pos.y}]`);
            }
            // attempt - we may not be at the distance yet, failure may be expected
            creep.rangedAttack(target);
        }

        // if we're at the range of the target, ranged attack, then move away from the target
        // after attacking
        if (creep.pos.inRangeTo(target.pos, ATTACK_RANGE)) {
            const code = creep.rangedAttack(target);
            if (code !== OK) {
                logger.failure(code, `Couldn't ranged attack target: ${target.id}`);
            }
            const nextDirection = {
                x: creep.pos.x + (creep.pos.x - target.pos.x),
                y: creep.pos.y + (creep.pos.y - target.pos.y)
            };
            const code2 = creep.moveTo(nextDirection.x, nextDirection.y, {visualizePathStyle: {stroke: '#88ff00'}});
            if (code2 !== OK) {
                logger.failure(code, `Couldn't move towards target: [${nextDirection.x, nextDirection.y}]`);
            }
        }
        // otherwise, we're out of the range of the target. Move towards it.
        else {
            const code = creep.moveTo(target, {visualizePathStyle: {stroke: '#ff8800'}});
            if (code !== OK) {
                logger.failure(code, `Couldn't move towards target: [${target.pos.x, target.pos.y}]`);
            }
        }
    }

    /**
     * A creep is finished attacking when the target is dead.
     */
    finished() {
        const target = Game.getObjectById(this.params.targetId);
        if (target.hits <= 0) {
            return true;
        }
    }

    shortDescription() {
        return '🏹';
    }
}

module.exports = RangedAttack;
