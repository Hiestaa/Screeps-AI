const BaseTask = require('tasks.BaseTask');
const {
    AT_FIGHTER_GROUP,
    T_EVALUATE_THREAT_DANGEROSITY,
    CP_RANGED_FIGHTER,
    CP_HEALER
} = require('constants');
const AssembleDefenseGroup = require('tasks.manager.AssembleDefenseGroup');
const DestroyTarget = require('tasks.manager.DestroyTarget');

const logger = require('log').getLogger('tasks.manager.EvaluateThreatDangerosity', 'white');

/**
 * If a hostile creep or building is found at a surrounding distance from targetted
 * hostile creep or building, they will be attacked together (priority to creeps?)
 */
const SURROUNDING_DISTANCE = 4;

/**
 * The task of destroying a target consists in getting a group of creeps to jointly
 * move towards the target and attack it, while the healers of the group are
 * tasked to keep the attackers healthy.
 */
class EvaluateThreatDangerosity extends BaseTask {
    /**
     * Create or reload a EvaluateThreatDangerosity task.
     * @param {Object} memory - stored memory, or provided bootstrap memory
     * @param {Object} memory.params - parameters for this task instance
     * @param {Object} memory.params.threatId - Id of the threat to evaluate
     * @param {Float} [memory.priority] - priority for this task
     * @param {Object} [memory.state] - reloaded state of the task
     */
    constructor({priority, state, params: {threatId}}={}) {
        super(
            T_EVALUATE_THREAT_DANGEROSITY, AT_FIGHTER_GROUP,
            {priority, state, params: {threatId}}, {
                frequency: 10
            }
        );
    }

    /**
     * Define the population target
     * There will be 2 ranged fighter, and 1 healer per threat in the area.
     * @return {Array<CONST>} - list of creep profiles
     */
    definePopulationTarget(threatIds) {
        const target = [];

        for (var i = 0; i < threatIds.length; i++) {
            target.push(CP_RANGED_FIGHTER);
            target.push(CP_RANGED_FIGHTER);
            target.push(CP_HEALER);
        }

        return target;
    }

    /**
     * Look at a 8x8 area around the target (2 * attack range + 2)
     * Returns the list of threats in this area, INCLUDING the one passed as parameter
     * TODO: make this function recursive so we also find the threats surrounding the
     * threats.
     * TODO: evaluate the cpu cost of this function and compare with more constrained
     * `room.lookAtArea()`
     * @param {FighterGroup} - the fighter group that will deal with this threat
     * @param {GameObject} threatId - the threat around which to identify other threats
     * @return {Array<GameObject>} - list of threats found in the surrounding area
     */
    findSurroundingThreats(fighterGroup, threat) {
        const pos = threat.pos;
        const room = fighterGroup.object('currentRoom');
        return room.find(FIND_HOSTILE_CREEPS)
            .filter(hostile => {
                return hostile.hits > 0 && hostile.pos.inRangeTo(pos, SURROUNDING_DISTANCE);
            });
    }

    execute(fighterGroup) {
        debugger;  // eslint-disable-line no-debugger
        const threat = Game.getObjectById(this.params.threatId);
        if (!threat || threat.hits === 0) { return; }
        const surroundingThreatIds = this.findSurroundingThreats(
            fighterGroup, threat)
            .map(t => t.id);
        logger.debug(`Threat ${threat.id} is surrounded by ${surroundingThreatIds} threats`);
        if (surroundingThreatIds.length === 0) { return; }

        const target = this.definePopulationTarget(surroundingThreatIds);

        if (!AssembleDefenseGroup.hasReachedTarget(fighterGroup, target)) {
            // if we haven't reached the population target yet, assemble the defense group and re-schedule
            // this task to re-evaluate the dangerosity once the group is assembled.
            fighterGroup.scheduleTask(new AssembleDefenseGroup({params: {target}}));
            fighterGroup.scheduleTask(new EvaluateThreatDangerosity({params: this.params}));
        }
        else {
            // if we have reached the population target - time to launch the attack!
            const threatId = surroundingThreatIds[0];
            if (threatId != this.params.threatId) {
                logger.info(`Revising threat target: ${this.params.threatId} -> ${threatId}`);
            }
            fighterGroup.scheduleTask(new DestroyTarget({params: {targetId: threatId}}));
        }
    }

    // one shot task
    finished() {
        return true;
    }

}

module.exports = EvaluateThreatDangerosity;
