const BaseManager = require('agents.BaseManager');
const {
    AT_CONTROLLER_MANAGER
} = require('constants');

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
        super(`ControllerManager ${controller.attachedGameObjects.controller.room.name}`,
              AT_CONTROLLER_MANAGER, creepActorIds, {}, {
                controller: controller.id
              }
        );
    }
}

module.exports = ControllerManager;
