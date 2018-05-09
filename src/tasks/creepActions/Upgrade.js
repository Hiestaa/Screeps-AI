const BaseCreepAction = require('tasks.creepActions.BaseCreepAction');
const {
    A_UPGRADE,
    CP_WORKER
} = require('constants');
const Fetch = require('tasks.creepActions.Fetch');
const Harvest = require('tasks.creepActions.Harvest');
const math = require('utils.math');
const logger = require('log').getLogger('tasks.creepAction.Upgrade', 'white');


/**
 * Move towards the assigned controller until reach, then upgrade the
 * controller until energy depletion.
 * TODO: to make them smarter and avoid dealing with haulers right now,
 * make the creep look for energy in a container nearby the controller if there is one,
 * or from a container anywhere in the room, or harvest the energy by themselves.
 */
class Upgrade extends BaseCreepAction {
    /**
     * Create or reload a Upgrade action.
     * @param {Float} [memory.priority] - priority for this action, used by the agent to control
     *                the execution order of his action.
     *                this MUST be provided when INSTANCIATING or RELOADING the objective.
     * @param {Object} memory.params - parameters for this objective, beware that
                       some objectives might have some required parameters
     * @param {ObjectId} memory.params.targetId - id of the target to which to deposit the resources
     * @param {Object} [memory.state] - the state of this objective, if the objective has
     *                 already been started.
     */
    constructor({priority, params: {controllerId}, state}) {
        super(new Set([CP_WORKER]), A_UPGRADE, {
            params: {controllerId},
            state,
            priority
        });
    }

    /**
     * Find a source to harvest from in the creep's room.
     */
    findSource(creepActor) {
        const creep = creepActor.object('creep');
        const sources = creep.room.find(STRUCTURE_SPAWN);
        if (sources.length === 0) {
            logger.error(
                'No energy container or source to harvest from - ' + creep.name +
                ' is unable to upgrade controller of room: ' + creep.room.name);
        }
        const {item} = math.min(sources, (source => creep.pos.getRangeTo(source.pos)));

        creepActor.scheduleTask(new Harvest({
            priority: this.priority,
            params: {sourceId: item.id}
        }));
    }

    /**
     * Find a container that holds energy in the room of the given creep and schedule
     * a fetch task, then a new upgrade task.
     * @param {CreepActor} creepActor - the actor who execute this action
     */
    findEnergyContainer(creepActor) {
        const creep = creepActor.object('creep');
        const containers = creep.room.find(STRUCTURE_CONTAINER)
            .filter(s => s.store[RESOURCE_ENERGY] > 0);
        if (containers.length === 0) {
            this.findSource(creepActor);
        }
        else {
            const {item} = math.max(containers, (container => container.store[RESOURCE_ENERGY]))
            creep.scheduleTask(new Fetch({
                priority: this.priority,
                params: {containerId: item.id}
            }));
        }
        creepActor.scheduleTask(new Upgrade({
            priority: this.priority,
            params: {controllerId: this.params.controllerId}
        }));
    }

    execute(creepActor) {
        super.execute(creepActor);
        const target = Game.getObjectById(this.params.controllerId);
        const creep = creepActor.object('creep');

        // if no energy, look for a container and schedule a fetch task
        // or a source and schedule a harvest task.
        if (creep.carry.energy === 0) {
            return this.findEnergyContainer();
        }
        // otherwise, move towards the controller.
        const code = creep.upgradeController(target, RESOURCE_ENERGY);
        if(code == ERR_NOT_IN_RANGE) {
            creep.moveTo(target, {visualizePathStyle: {stroke: '#ffffff'}});
        }
        else if (code !== OK) {
            logger.failure(code, `Creep ${creep.name} is unable to upgrade controller of room: ${target.room.name}`);
        }
    }

    /**
     * A creep is finished upgrading when it is empty.
     * @param {CreepActor} creepActor - creep actor executing the action
     */
    finished(creepActor) {
        const creep = creepActor.object('creep');
        return creep.carry.energy == 0;
    }

    shortDescription() {
        return '⬆️';
    }
}

module.exports = Upgrade;
