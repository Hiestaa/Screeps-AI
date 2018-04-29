const BaseTask = require('tasks.BaseTask');
const {
    AT_FIGHTER_GROUP,
    T_ASSEMBLE_DEFENSE_GROUP,
    AT_CREEP_ACTOR,
    A_MOVE
} = require('constants');
const {
    ROOM_SIZE
} = require('settings');
const Move = require('tasks.creepActions.Move');
const logger = require('log').getLogger('tasks.manager.AssembleDefenseGroup', 'white');

// TODO: make this a function of the number of creeps in the fighter group
const GROUP_POINT_DISTANCE_FROM_SPAWN = 5;

/**
 * The task of assembling a defense group will make the attached creeps
 * move around until enough creeps are ready to group up and and launch an
 * attach.
 * A target is set in the params by specifying a certain number of creeps
 * of each profile. When the target is reached, the creeps are grouped together.
 * When the group is ready, the task is finished.
 * Note that this does not take care of spawning the creeps - this should be made
 * externally by the spawn actor following a colony-wide population objective.
 */
class AssembleDefenseGroup extends BaseTask {
    /**
     * Create or reload a AssembleDefenseGroup task.
     * @param {Object} memory - stored memory, or provided bootstrap memory
     * @param {Object} memory.params - parameters for this task instance
     * @param {Object} memory.params.target - {<creepProfile>: number}
     *                 set a target to the number of creeps that should be part
     *                 of the group before the task is finished.
     * @param {Float} [memory.priority] - priority for this task
     * @param {Object} [memory.state] - reloaded state of the task
     */
    constructor({priority, state, params: {target}}={}) {
        super(
            T_ASSEMBLE_DEFENSE_GROUP, AT_FIGHTER_GROUP,
            {priority, state, params: {target}}, {
                frequency: 10
            }
        );
    }

    /**
     * Find an appropriate group up point to direct creeps towards.
     * The result of this function is cached and calling it a second time is
     * basically free.
     * @param {FighterGroup} fighterGroup - the fightergroup to group up, to find
     *                       in which room to perform the reunion.
     * @return {Object} - a {x, y} position object indicating the group up spot
     */
    findGroupUpSpot(fighterGroup) {
        const room = fighterGroup.object('currentRoom');
        if (this.state.groupUpSpot) {
            return this.state.groupUpSpot;
        }

        const spawns = room.find(FIND_MY_STRUCTURES, {
            filter: {structureType: STRUCTURE_SPAWN}
        });
        let around = null;
        if (spawns.length === 0) {
            logger.error(
                `No spawn found in fighter group '${fighterGroup.name}' ` +
                `current room ${room.name}`);
            around = {x: 25, y: 25};
        }
        around = spawns[0].pos;
        const offset = GROUP_POINT_DISTANCE_FROM_SPAWN;
        const candidates = [
            {x: Math.max(around.x - offset, 0), y: around.y},
            {x: Math.max(around.x - offset, 0), y: Math.max(around.y - offset, 0)},
            {x: around.x, y: Math.max(around.y - offset, 0)},
            {x: Math.min(around.x + offset, ROOM_SIZE - 1), y: Math.max(around.y - offset, 0)},
            {x: Math.min(around.x + offset, ROOM_SIZE - 1), y: around.y},
            {x: Math.min(around.x + offset, ROOM_SIZE - 1), y: Math.min(around.y + offset, ROOM_SIZE - 1)},
            {x: around.x, y: Math.min(around.y + offset, ROOM_SIZE - 1)},
            {x: Math.max(around.x - offset, 0), y: Math.min(around.y + offset, ROOM_SIZE - 1)}
        ];
        candidates.forEach(({x, y}) => {
            room.visual.rect(x - 1, y - 1, 2, 2, {fill: 'rgba(255, 186, 0, 0.3)'});
        });
        let selection = null;
        const candidatesVal = {};

        for (var i = candidates.length - 1; i >= 0; i--) {
            const lookAt = room.lookForAtArea(
                LOOK_TERRAIN,
                candidates[i].y - 2, candidates[i].x - 2,
                candidates[i].y + 2, candidates[i].x + 2, true
            ).filter(lookObj => {
                return lookObj.terrain !== 'wall';
            });
            candidatesVal[i] = lookAt.length;

            if (lookAt.length > 10) {
                selection = candidates[i];
                break;
            }
        }

        if (selection === null) {
            selection = candidates[Object.keys(candidatesVal).sort((k1, k2) => {
                return candidatesVal[k2] - candidatesVal[k1];
            })[0]];
        }

        this.state.groupUpSpot = selection;
        logger.info(`Group-up Spot for ${fighterGroup.name}: {x: ${selection.x}, y: ${selection.y}}`);

        return selection;
    }

    /**
     * Compares the number of creeps attaached to the given fighter group to the
     * number of creeps expected following the defined target.
     * @param {FighterGroup} fighterGroup - a fighter group instance
     * @return {Boolean} - true if all expected creep profiles are attached
     *                   to the given fighter group.
     */
    static hasReachedTarget(fighterGroup, target) {
        const profilesCount = Object.keys(fighterGroup.attachedAgents).reduce((acc, k) => {
            const creepActor = fighterGroup.attachedAgents[k];
            acc[creepActor.creepProfile] = (
                acc[creepActor.creepProfile] || 0) + 1;
            return acc;
        }, {});
        const targetCount = target.reduce((acc, profile) => {
            acc[profile] = (acc[profile] || 0) + 1;
            return acc;
        }, {});

        return Object.keys(targetCount).every(profile => {
            return (profilesCount[profile] || 0) >= (targetCount[profile] || 0);
        });
    }

    /**
     * Group the creep together by assigning move tasks.
     * When the target is reached and all creeps have been groupped up, the task
     * is finished.
     */
    execute(fighterGroup) {
        const room = fighterGroup.object('currentRoom');
        const attachedCreeps = Object.keys(fighterGroup.attachedAgents);
        if (attachedCreeps.length === 0) { return; }

        // firstly, make sure each creep has an assigned position to group up to
        if (!this.state.assignedPositions ||
            !attachedCreeps.every(cn => this.state.assignedPositions[cn])) {
            this.state.assignedPositions = {};
            const groupUpSpot = this.findGroupUpSpot(fighterGroup);
            const squareSize = Math.ceil(Math.sqrt(attachedCreeps.length));
            const offset = Math.round(squareSize / 2);
            for (var i = 0; i < attachedCreeps.length; i++) {
                this.state.assignedPositions[attachedCreeps[i]] = {
                    x: groupUpSpot.x - offset + Math.floor(i / squareSize),
                    y: groupUpSpot.y - offset + i % squareSize
                };
            }
        }

        if (this.state.groupUpSpot) {
            room.visual.rect(
                this.state.groupUpSpot.x - 1, this.state.groupUpSpot.y - 1,
                2, 2, {fill: 'rgba(255, 85, 0, 0.6)'});
        }

        // then, ensure that each creep either is at its assigned position, or
        // has a task to reach the current position.
        const nonGrouppedCreeps = attachedCreeps.filter(key => {
            const creepActor = fighterGroup.agent(key);
            const assignedPos = this.state.assignedPositions[key];

            if (creepActor.type !== AT_CREEP_ACTOR) { return false; }

            // Keep creeps that aren't at the defined position
            return (
                creepActor.object('creep').pos.x != assignedPos.x ||
                creepActor.object('creep').pos.y != assignedPos.y);
        });

        // if there is any idle creep, assign him a move task to the defined position
        nonGrouppedCreeps.forEach(key => {
            const creepActor = fighterGroup.agent(key);
            if (creepActor.hasTaskScheduled(A_MOVE)) { return; }
            const assignedPos = this.state.assignedPositions[key];
            creepActor.scheduleTask(new Move({params: {target: assignedPos}}));
        });

        // if relevant, mark finished now to avoid recomputing stuff
        if (nonGrouppedCreeps.length === 0 &&
            AssembleDefenseGroup.hasReachedTarget(fighterGroup, this.params.target)) {
            debugger; // eslint-disable-line no-debugger
            const res = AssembleDefenseGroup.hasReachedTarget(fighterGroup, this.params.target);
            console.log(res);
            this.state.finished = true;
        }
    }

    finished() {
        return this.state.finished === true;
    }

}

module.exports = AssembleDefenseGroup;
