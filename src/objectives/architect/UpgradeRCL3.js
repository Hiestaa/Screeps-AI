const BaseObjective = require('objectives.BaseObjective');
const {
    O_UPGRADE_RCL_3,
    AT_ARCHITECT
} = require('constants');
const PopulateGroupsFromProfile = require('tasks.architect.PopulateGroupsFromProfile');
const MaintainBuildings = require('objectives.manager.MaintainBuildings');
// const UpgradeRCL4 = require('objectives.architect.UpgradeRCL4');

class UpgradeRCL3 extends BaseObjective {
    constructor(memory={}) {
        super(O_UPGRADE_RCL_3, AT_ARCHITECT, memory);
    }

    execute(architect) {
        if (architect.unassignedCreepActorIds.length > 0) {
            const creepActorIds = architect.unassignedCreepActorIds.splice(0);
            architect.scheduleTask(new PopulateGroupsFromProfile({params: {creepActorIds}}));
        }

        const buildingManager = architect.agent('builders');

        if (!buildingManager.currentObjective || buildingManager.currentObjective.params.roomLevel != 3) {
            buildingManager.setObjective(new MaintainBuildings({
                params: {
                    containersLocations: architect.getContainerLocations(),
                    extensionsLocations: architect.getExtensionsLocations(),
                    roomLevel: 3
                }
            }));
        }

        // if (architect.object('room').controller.level >= 3) {
        //     this.setObjective(new UpgradeRCL4());
        // }
    }
}

module.exports = UpgradeRCL3;
