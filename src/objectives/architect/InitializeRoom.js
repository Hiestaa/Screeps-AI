const BaseObjective = require('objectives.BaseObjective');
const {
    O_INITIALIZE_ROOM,
    AT_ARCHITECT
} = require('constants');
const PopulateInitialGroups = require('tasks.architect.PopulateInitialGroups');

/**
 * The InitializeRoom objective consists in getting the basic room structure
 * going until we can work on a more advanced objectives.
 */
class InitializeRoom extends BaseObjective {
    constructor({priority, params, state}={}) {
        super(O_INITIALIZE_ROOM, AT_ARCHITECT, {priority, params, state});
    }

    /**
     * This objective consists in scheduling populate group tasks when
     * new creep agent are created, and to clear up the unassigned creep actor ids
     * list the architect is holding.
     * TODO: On top of this, it will make sure the managers all have an objective assigned,
     * so they keep their creeps busy.
     */
    execute(architect) {
        if (architect.unassignedCreepActorIds.length > 0) {
            const creepActorIds = architect.unassignedCreepActorIds.splice(0);
            this.architect.scheduleTask(new PopulateInitialGroups({params: creepActorIds}));
        }
    }
}

module.exports = InitializeRoom;
