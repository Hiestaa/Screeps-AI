const BaseObjective = require('objectives.BaseObjective');
const {
    O_UPGRADE_RCL_2,
    AT_ARCHITECT
} = require('constants');
const PopulateInitialGroups = require('tasks.architect.PopulateInitialGroups');
// const UpgradeRCL3 = require('objectives.architect.UpgradeRCL3');

/**
 * The UpgradeRCL2 objective consists in prioritizing the upgrade of the rooom
 * controller after having redefined the creep tasks.
 * Starting with this objective, creeps will be assigned to group based on their
 * creep profile (workers to building, harvesters to source manager, haulers
 * to the logistic manager, carriers to the controller manager, etc...)
 * When the RCL gets to level 2, it set the objective `UpgradeRCL3`
 */
class UpgradeRCL2 extends BaseObjective {
    constructor(memory={}) {
        super(O_UPGRADE_RCL_2, AT_ARCHITECT, memory);
    }

    execute(architect) {
        if (architect.unassignedCreepActorIds.length > 0) {
            const creepActorIds = architect.unassignedCreepActorIds.splice(0);
            architect.scheduleTask(new PopulateInitialGroups({params: {creepActorIds}}));
        }
        if (architect.object('room').controller.level >= 2) {
            // this.setObjective(new UpgradeRCL3());
        }
    }
}

module.exports = UpgradeRCL2;
