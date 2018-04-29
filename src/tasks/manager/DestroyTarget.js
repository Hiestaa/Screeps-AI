const BaseTask = require('tasks.BaseTask');
const {
    AT_FIGHTER_GROUP,
    T_DESTROY_TARGET,
    AT_CREEP_ACTOR,
    A_HEAL,
    A_MOVE,
    A_RANGED_ATTACK,
    CP_HEALER,
    CP_RANGED_FIGHTER
} = require('constants');
const Move = require('tasks.creepActions.Move');
const RangedAttack = require('tasks.creepActions.RangedAttack');
const Heal = require('tasks.creepActions.Heal');

const logger = require('log').getLogger('tasks.manager.DestroyTarget', 'white');

/*
 * Distance from the target at which the group should position itself before
 * launching the attack (e.g.: distributing Attack / RangedAttack tasks to creeps
 * of the group).
 * This should be far enough that we aren't under enemy fire.
 */
const ATTACK_DISTANCE = 6;

/**
 * The task of destroying a target consists in getting a group of creeps to jointly
 * move towards the target and attack it, while the healers of the group are
 * tasked to keep the attackers healthy.
 */
class DestroyTarget extends BaseTask {
    /**
     * Create or reload a DestroyTarget task.
     * @param {Object} memory - stored memory, or provided bootstrap memory
     * @param {Object} memory.params - parameters for this task instance
     * @param {Object} memory.params.targetId - Id of the target to destroy
     * @param {Float} [memory.priority] - priority for this task
     * @param {Object} [memory.state] - reloaded state of the task
     */
    constructor({priority, state, params: {targetId}}={}) {
        super(
            T_DESTROY_TARGET, AT_FIGHTER_GROUP,
            {priority, state, params: {targetId}}, {
                frequency: 10
            }
        );
    }

    /**
     * Pick the healer among the attached creeps that is the less busy to
     * heal the given target
     * @param {Array<CreepActor>} attachedCreeps - creeps attached to the fighter
     *                            group executing the task
     * @param {Creep)} target - creep to heal
     */
    scheduleHealTask(attachedCreeps, target) {
        debugger;  // eslint-disable-line no-debugger
        // if some attached creep is already tasked to heal this specific target,
        // we don't need to keep the scheduleHealTask going any further.
        if (attachedCreeps.some(ca => {
            return ca.hasTaskScheduled(A_HEAL, {
                filter: (t) => t.params.targetId === target.id
            });
        })) { return; }

        let attachedHealers = attachedCreeps.filter(ca => {
            return ca.creepProfile === CP_HEALER;
        });
        let lessBusy = null;
        let minNbTask = null;
        attachedHealers.forEach(h => {
            const nbTasksScheduled = h.nbTasksScheduled(A_HEAL);
            if (minNbTask === null && lessBusy === null) {
                minNbTask = nbTasksScheduled;
                lessBusy = h;
            }
            if (nbTasksScheduled < minNbTask) {
                minNbTask = nbTasksScheduled;
                lessBusy = h;
            }
        });
        if (lessBusy === null) {
            logger.error(
                `Unable to schedule heal task to target: ${target.name || target.id} ` +
                '- no healer in the group');
            return;
        }
        lessBusy.scheduleTask(new Heal({params: {targetId: target.id}}));
    }

    execute(fighterGroup) {
        const attachedCreeps = Object.keys(fighterGroup.attachedAgents).map(k => {
            return fighterGroup.agent(k);
        }).filter(agent => {
            return agent.type == AT_CREEP_ACTOR;
        });
        const target = Game.getObjectById(this.params.targetId);

        if (!target || target.hits === 0) {
            // target is read
            this.state.finished = true;
            return;
        }

        if (attachedCreeps.length === 0) { return; }  // can't attack without creeps
        if (attachedCreeps.every(ca => ca.hasTaskScheduled())) { return; }  // let scheduled tasks happen

        debugger;  // eslint-disable-line no-debugger

        // if any creep has a low health, find the less busy healer of the group
        // and assign it a healing task
        attachedCreeps.forEach(creepActor => {
            const creep = creepActor.object('creep');
            if (creep.hits < creep.hitsMax) {
                this.scheduleHealTask(attachedCreeps, creep);
            }
        });

        // If any creep is at more than ATTACK_DISTANCE from the target, schedule
        // move task to get closer to the target (stop at ATTACK_DISTANCE range)
        attachedCreeps.forEach(creepActor => {
            const creep = creepActor.object('creep');
            if (!creep.pos.inRangeTo(target.pos, ATTACK_DISTANCE) &&
                !creepActor.hasTaskScheduled(A_MOVE)) {
                creepActor.scheduleTask(new Move({params: {
                    targetId: this.params.targetId,
                    distanceFrom: ATTACK_DISTANCE
                }}));
            }
        });

        // Now schedule an attack task on each creep that currently doesn't have one.
        // this will only be executed when the creep reaches the ATTACK_DISTANCE to the
        // target.
        attachedCreeps.forEach(creepActor => {
            if (creepActor.creepProfile === CP_RANGED_FIGHTER) {
                if (!creepActor.hasTaskScheduled(A_RANGED_ATTACK)) {
                    creepActor.scheduleTask(new RangedAttack({params: {
                        targetId: this.params.targetId
                    }}));
                }
            }
        });
    }

    finished() {
        return this.state.finished === true;
    }

}

module.exports = DestroyTarget;
