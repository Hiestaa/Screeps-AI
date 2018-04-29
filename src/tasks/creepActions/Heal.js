const BaseCreepAction = require('tasks.creepActions.BaseCreepAction');
const {
    A_RANGED_ATTACK,
    CP_RANGED_FIGHTER,
} = require('constants');
const logger = require('log').getLogger('tasks.creepActions.Heal', 'white');

const HEAL_RANGE = 3;
const CLOSE_HEAL_RANGE = 1;
const HITPOINTS_THRESHOLD = 80;  // %

/**
 * Semi-smart heal action.
 * The healer will move towards the target to heal it.
 * If the healer is full life, it will go as close as possible to the target
 * to maximize heal efficiency.
 * If the healer's hitpoints fall below HITPOINTS_THRESHOLD %, the healer backs off
 * to maximum healing distance from the target.
 * The task is completed when the target has full hitpoint, or dead.
 */
class Heal extends BaseCreepAction {
    /**
     * Create or reload a Heal action.
     * @param {Float} [memory.priority] - priority for this action, used by the agent to control
     *                the execution order of his action.
     *                this MUST be provided when INSTANCIATING or RELOADING the objective.
     * @param {Object} memory.params - parameters for this objective, beware that
                       some objectives might have some required parameters
     * @param {ObjectId} memory.params.targetId - id of the object that should be healed
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
        super.execute(creepActor);
        const creep = creepActor.object('creep');
        const target = Game.getObjectById(this.params.targetId);
        if (target.hits >= target.hitsMax) { return; }

        // if the creep is just one off of the range of the target, we can move
        // and ranged heal at the same tick.
        if (creep.pos.inRangeTo(target.pos, HEAL_RANGE + 1) &&
            !creep.pos.inRangeTo(target.pos, HEAL_RANGE)) {
            const code = creep.moveTo(target,  {visualizePathStyle: {stroke: '#00FF00'}});
            if (code !== OK) {
                logger.failure(code, `Couldn't move towards target: [${target.pos.x}, ${target.pos.y}]`);
            }
            const code2 = creep.rangedHeal(target);
            if (code2 !== OK) {
                logger.failure(code2, `Couldn't ranged heal target: ${target.name || target.id}`);
            }
        }

        // if we're at the (long) range of the target, we can still move and
        // ranged heal at the same tick.
        // The creep will move towards the target if it's full life, or away
        // from the target if it has low hitpoints.
        else if (creep.pos.inRangeTo(target.pos, HEAL_RANGE) &&
                 !creep.pos.inRangeTo(target.pos, CLOSE_HEAL_RANGE)) {
            if (creep.hits > creep.hitsMax * HITPOINTS_THRESHOLD / 100) {
                // move towards the target, then ranged heal, then try to heal
                const code = creep.moveTo(target, {visualizePathStyle: {stroke: '#00FF00'}});
                if (code !== OK) {
                    logger.failure(code, `Couldn't move towards target: [${target.pos.x}, ${target.pos.y}])`);
                }
                const code2 = creep.rangedHeal(target);
                if (code2 !== OK) {
                    logger.failure(code2, `Couldn't ranged heal target: ${target.name || target.id}`);
                }
                // if we were just above the HEAL_RANGE, and successfully moves, attempt a heal
                // if might fail if the move didn't cover the distance, so don't log the failure
                if (code === OK && creep.pos.inRangeTo(target.pos, CLOSE_HEAL_RANGE + 1)) {
                    creep.heal(target);
                }
            }
            else {
                // ranged heal, then move away from the target.
                const code = creep.rangedHeal(target);
                if (code !== OK) {
                    logger.failure(code, `Couldn't ranged heal target: ${target.name || target.id}`);
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
        }

        // if we're at the short range of the target, we do both rangedHeal, and heal
        // in this order. If the creep's hitpoints are below the threshold, we can also
        // move away from the creep at the same tick.
        else if (creep.pos.inRangeTo(target.pos, CLOSE_HEAL_RANGE)) {
            const code = creep.rangedHeal(target);
            if (code !== OK) {
                logger.failure(code, `Couldn't ranged heal target: ${target.name || target.id}`);
            }
            const code2 = creep.heal(target);
            if (code2 !== OK) {
                logger.failure(code, `Couldn't heal target: ${target.name || target.id}`);
            }
            if (creep.hits < creep.hitsMax * HITPOINTS_THRESHOLD / 100) {
                const nextDirection = {
                    x: creep.pos.x + (creep.pos.x - target.pos.x),
                    y: creep.pos.y + (creep.pos.y - target.pos.y)
                };
                const code3 = creep.moveTo(nextDirection.x, nextDirection.y, {visualizePathStyle: {stroke: '#88ff00'}});
                if (code3 !== OK) {
                    logger.failure(code, `Couldn't move towards target: [${nextDirection.x, nextDirection.y}]`);
                }
            }
        }

        // otherwise, we're far away from the target. Move towards it.
        else {
            const code = creep.moveTo(target, {visualizePathStyle: {stroke: '#00ff00'}});
            if (code !== OK) {
                logger.failure(code, `Couldn't move towards target: [${target.pos.x, target.pox.y}]`);
            }
        }
    }

    /**
     * A creep is finished attacking when the target is dead.
     */
    finished() {
        const target = Game.getObjectById(this.params.targetId);
        if (target.hits >= target.hitsMax) {
            return true;
        }
    }

    shortDescription() {
        return '💊';
    }

}

module.exports = Heal;
