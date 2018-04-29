const BaseObjective = require('objectives.BaseObjective');
const {
    AT_FIGHTER_GROUP,
    O_CLEAR_ROOM_THREATS
} = require('constants');
const Garrisons = require('objectives.manager.Garrisons');
const EvaluateThreatDangerosity = require('tasks.manager.EvaluateThreatDangerosity');

/**
 * The objective is about assembling enouugh creeps to be able to overtake the
 * threats present in the room attached to the fighter group (this is todo),
 * destroy all targets, and pass the hand to the next objective which will
 * be to create garrisons to protect the room from invaders.
 */
class ClearRoomThreat extends BaseObjective {
    constructor(memory={}) {
        super(O_CLEAR_ROOM_THREATS, AT_FIGHTER_GROUP, memory, {
            frequency: 100
        });
    }

    /**
     * The execution of this objective does nothing if the fighter group has
     * a task scheduled.
     * If it does not, the `EvaluateThreatDangerosity` task is scheduled for
     * the specified threat. This task will naturally lead to a `AssembleDefenseGroup`
     * or a `DestroyTarget` task, and the fighter group wil lonly remain task-less
     * when the threat is eliminated.
     */
    execute(fighterGroup) {
        const room = fighterGroup.object('currentRoom');
        if (fighterGroup.hasTaskScheduled()) { return; }

        if (!this.state.threatIds || this.state.threatIds.length === 0) {
            this.state.threatIds = room.find(FIND_HOSTILE_CREEPS).map(t => t.id);
        }
        // if we just refreshed the list of threats, and there is still
        // none found so far, we've truly got rid of all targets.
        if (this.state.threatIds.length === 0) {
            fighterGroup.setObjective(new Garrisons());
            return;
        }

        const threatId = this.state.threatIds.pop(0);
        fighterGroup.scheduleTask(new EvaluateThreatDangerosity({params: {threatId}}));
    }
}

module.exports = ClearRoomThreat;
