const BaseObjective = require('objectives.BaseObjective');
const {
    AT_FIGHTER_GROUP,
    O_GARRISONS
} = require('constants');
const EvaluateThreatDangerosity = require('tasks.manager.EvaluateThreatDangerosity');

/**
 * The garrisons task will place strategic construction site for towers,
 * and assign creeps tasked to kill anything that wanders closeby around
 * that construction site.
 * The responsability to build the construction site is left to another
 * manager.
 * Since the single defense group should manage all the garrisons, it
 * should also be able to react to more threatening enemies by gathering
 * forces.
 * All of this is TODO my friend, yay :D
 */
class DistributeEnergy extends BaseObjective {
    constructor(memory={}) {
        super(O_GARRISONS, AT_FIGHTER_GROUP, memory, {
            frequency: 20
        });
    }

    /**
     * WIP: duplicate of ClearRoomThreat for now, except that the objective
     * remain active forever and assign `EvaluateThreatDangerosity` when necessary
     * @param {FighterGroup} fighterGroup
     */
    execute(fighterGroup) {
        const room = fighterGroup.object('currentRoom');
        if (fighterGroup.hasTaskScheduled()) { return; }

        if (!this.state.threatIds || this.state.threatIds.length === 0) {
            this.state.threatIds = room.find(FIND_HOSTILE_CREEPS).map(t => t.id);
        }

        if (this.state.threatIds.length === 0) {
            // TODO: if there is no target, put all creeps in garrison somewhere.
            // find a heuristic to pick good garrison spots,
            // add some tower construction site to mark the spot,
            // move creeps towards assigned spots.
            return;
        }

        const threatId = this.state.threatIds.pop(0);
        fighterGroup.scheduleTask(new EvaluateThreatDangerosity({params: {threatId}}));
    }
}

module.exports = DistributeEnergy;
