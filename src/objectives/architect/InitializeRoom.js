const BaseObjective = require('objectives.BaseObjective');
const {
    O_INITIALIZE_ROOM,
    AT_ARCHITECT
} = require('constants');
const PopulateInitialGroups = require('tasks.architect.PopulateInitialGroups');
const StayFilledUp = require('objectives.manager.StayFilledUp');
const DistributeEnergy = require('objectives.manager.DistributeEnergy');
const ClearRoomThreat = require('objectives.manager.ClearRoomThreat');

/**
 * The InitializeRoom objective consists in getting the basic room structure
 * going until we can work on a more advanced objectives.
 */
class InitializeRoom extends BaseObjective {
    constructor(memory={}) {
        super(O_INITIALIZE_ROOM, AT_ARCHITECT, memory);
    }

    /**
     * This objective consists in scheduling populate group tasks when
     * new creep agent are created, and to clear up the unassigned creep actor ids
     * list the architect is holding.
     * On top of this, it will make sure the managers all have an objective assigned,
     * so they keep their creeps busy.
     */
    execute(architect) {
        if (architect.unassignedCreepActorIds.length > 0) {
            const creepActorIds = architect.unassignedCreepActorIds.splice(0);
            architect.scheduleTask(new PopulateInitialGroups({params: {creepActorIds}}));
        }
        const spawnManager = architect.agent('spawn');
        const sources = architect.getSourceManagers();
        const defenseGroup = architect.agent('defenseGroup');

        if (!spawnManager.hasObjective()) {
            spawnManager.setObjective(new StayFilledUp());
        }

        sources.forEach(s => {
            if (!s.hasObjective()) {
                s.setObjective(new DistributeEnergy());
            }
        });

        if (!defenseGroup.hasObjective()) {
            // clear room threat will itself lead to garrisons objective once
            // the threats are all eliminated
            defenseGroup.setObjective(new ClearRoomThreat());
        }

        // TODO: determine a termination criteria for what is a 'initialized room'
        // and schedule the next objective down the line
    }
}

module.exports = InitializeRoom;
