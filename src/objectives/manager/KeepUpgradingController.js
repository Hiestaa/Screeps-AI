const BaseObjective = require('objectives.BaseObjective');
const {
    AT_CONTROLLER_MANAGER,
    O_KEEP_UPGRADING_CONTROLLER,
    AT_CREEP_ACTOR,
    A_UPGRADE
} = require('constants');
const Upgrade = require('tasks.creepActions.Upgrade');
const logger = require('log').getLogger('objectives.manager.KeepUpgradingController');

/**
 * The KeepUpgradingController objective simply re-schedule periodically
 * the T_BE_UPGRADED task on the controller managermanager that executes it.
 */
class KeepUpgradingController extends BaseObjective {
    constructor(memory={}) {
        super(O_KEEP_UPGRADING_CONTROLLER, AT_CONTROLLER_MANAGER, memory, {
            frequency: 5
        });
    }

    execute(controllerManager) {
        Object.keys(controllerManager.attachedAgents).forEach(key => {
            const creepActor = controllerManager.attachedAgents[key];

            if (key === 'controller') { return; }
            if (!creepActor) { return logger.error(`Attached agent ${key} is undefined`); }
            if (creepActor.type !== AT_CREEP_ACTOR) { return; }

            if (creepActor.hasTaskScheduled(A_UPGRADE)) { return; }

            creepActor.scheduleTask(new Upgrade({
                params: {controllerId: controllerManager.object('controller').id},
                priority: 5
            }));
        });
    }
}

module.exports = KeepUpgradingController;
