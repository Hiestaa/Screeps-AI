const BaseObjective = require('objectives.BaseObjective');
const {
    O_UPGRADE_RCL_2,
    AT_ARCHITECT,
    O_KEEP_UPGRADING_CONTROLLER
} = require('constants');
const PopulateGroupsFromProfile = require('tasks.architect.PopulateGroupsFromProfile');
const KeepUpgradingController = require('objectives.manager.KeepUpgradingController');
const DistributeEnergy = require('objectives.manager.DistributeEnergy');
const MaintainBuildings = require('objectives.manager.MaintainBuildings');
const EnergyFlow = require('objectives.manager.EnergyFlow');
const UpgradeRCL3 = require('objectives.architect.UpgradeRCL3');

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
            architect.scheduleTask(new PopulateGroupsFromProfile({params: {creepActorIds}}));
        }

        // update the objective of the source managers to enable their harvesters to harvest forever
        const sources = architect.getSourceManagers();
        sources.forEach(s => {
            if (!s.isDangerous() && (!s.hasObjective() || !s.currentObjective.params.fixedSpot)) {
                s.setObjective(new DistributeEnergy({params: {fixedSpot: true}}));
            }
        });

        // the controller will now start assigning upgrade tasks to the creep actors it manages
        const controllerManager = architect.agent('controller');
        if (!controllerManager.hasObjective(O_KEEP_UPGRADING_CONTROLLER)) {
            controllerManager.setObjective(new KeepUpgradingController());
        }

        // TODO: consolidate setting the MaintainBuildings objective in UpgradeRCL2 and UpgradeRCL3
        // as well as the EnergyFlow and the DistributeEnergy and KeepUpgradingController.
        const buildingManager = architect.agent('builders');
        if (!buildingManager.hasObjective()) {
            buildingManager.setObjective(new MaintainBuildings({
                params: {
                    containersLocations: architect.getContainerLocations(),
                    roomLevel: 1
                }
            }));
        }

        const logisticManager = architect.agent('logistic');
        if (!logisticManager.hasObjective()) {
            logisticManager.setObjective(new EnergyFlow({
                params: {
                    mineContainersPos: architect.getContainerLocations(),
                    extensionsPos: architect.getExtensionsLocations(),
                    controllerContainersPos: []
                }
            }));
        }

        // do we need to redefine the roles of existing creeps?
        // probably not - they are going to die doing whatever they wanna do, then
        // be replaced by other creeps that will be properly assigned.

        if (architect.object('room').controller.level >= 2) {
            architect.setObjective(new UpgradeRCL3());
        }
    }
}

module.exports = UpgradeRCL2;
