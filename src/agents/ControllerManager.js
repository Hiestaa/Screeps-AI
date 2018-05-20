const BaseManager = require('agents.BaseManager');
const {
    AT_CONTROLLER_MANAGER
} = require('constants');
const logger = require('log').getLogger('agents.ControllerManager', 'white');

/**
 * The ControllerManager is instanciated on request of an architect and deals
 * with the concern of getting that room controller upgraded.
 * Its main concern is not to let the controller level down.
 * Upgrading the controller is a lower priority and should only be taken care of
 * when they don't have more important tasks to do
 */
class ControllerManager extends BaseManager {
    /**
     * Initialize the controller manager
     * @param {StructureController} controller - the controller this manager should take care of
     * @param {Array} creepActorIds - ids of creep actors this manager can control
     */
    initialize(controller, creepActorIds=[]) {
        super.initialize(`ControllerManager ${controller.room.name}`,
            AT_CONTROLLER_MANAGER, creepActorIds, {}, {
                controller: controller.id
            }
        );
    }


    /**
     * CPU expensive function that will look at the area around the controller
     * to find the list of upgrade spots.
     */
    findUpgradeSpots() {
        if (this.danger) { return []; }
        const controller = this.object('controller');

        const upgradeSpots = controller.room.lookAtArea(
            controller.pos.y - 3, controller.pos.x - 3,
            controller.pos.y + 3, controller.pos.x + 3, true
        ).filter((lookObj) => {
            return (
                lookObj.type === LOOK_TERRAIN &&
                lookObj[lookObj.type] !== 'wall'
            );
        }).map(lookObj => {
            return {x: lookObj.x, y: lookObj.y};
        });
        this.nbUpgradeSpots = upgradeSpots.length;

        return upgradeSpots;
    }

    /**
     * Get the number of upgrade spots on the attached controller.
     * The number of upgrade spots is the number of non-wall terrain around the controller.
     * The result is memorized so calling this function multiple times doesn't
     * lead to unecessary duplicated computations.
     * @return {Integer} - the number of upgrade spots
     */
    getNbUpgradeSpots() {
        if (this.nbUpgradeSpots) { return this.nbUpgradeSpots; }

        const controller = this.object('controller');
        const upgradeSpots = this.findUpgradeSpots();
        this.nbUpgradeSpots = upgradeSpots.length;

        logger.debug(`${this.name} (controllerId=${controller.id}) has ${this.nbUpgradeSpots} upgrade spots.`);
        return this.nbUpgradeSpots;
    }

    load(state) {
        super.load(state);
        this.nbUpgradeSpots = state.nbUpgradeSpots;
    }

    save(state) {
        super.save(state);
        state.nbUpgradeSpots = this.nbUpgradeSpots;
    }
}

module.exports = ControllerManager;
