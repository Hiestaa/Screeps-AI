const BaseCreepAction = require('tasks.creepActions.BaseCreepAction');
const {
    A_SUPERFETCH,
    CP_WORKER,
    CP_HAULER
} = require('constants');
const Fetch = require('tasks.creepActions.Fetch');
const Harvest = require('tasks.creepActions.Harvest');
const math = require('utils.math');
const logger = require('log').getLogger('tasks.creepActions.SuperFetch', 'white');

/**
 * Fetch energy from a container, a dropped energy, or harvest from a source.
 */
class SuperFetch extends BaseCreepAction {
    /**
     * Create or reload a SuperFetch action.
     * @param {Float} [memory.priority] - priority for this action, used by the agent to control
     *                the execution order of his action.
     *                this MUST be provided when INSTANCIATING or RELOADING the objective.
     * @param {Object} memory.params - parameters for this objective, beware that
                       some objectives might have some required parameters
     * @param {Object} [memory.state] - the state of this objective, if the objective has
     *                 already been started.
     */
    constructor({priority, params, state}) {
        super(new Set([CP_WORKER, CP_HAULER]), A_SUPERFETCH, {
            params,
            state,
            priority
        });
        this.amountFetched = 0;
        this.hasFinished = false;
    }

    /**
     * Find a source to harvest from in the creep's room.
     */
    findSource(creepActor) {
        const creep = creepActor.object('creep');
        const sources = creep.room.find(FIND_SOURCES_ACTIVE);
        if (sources.length === 0) {
            logger.error(
                'No energy container or source to harvest from - ' + creep.name +
                ' is unable to upgrade controller of room: ' + creep.room.name);
            return;
        }

        const {item} = math.min(sources, (source => creep.pos.getRangeTo(source.pos)));

        creepActor.scheduleTask(new Harvest({
            priority: this.priority + 1,
            params: {sourceId: item.id}
        }));
        this.hasFinished = true;
    }

    findDroppedEnergy(creepActor) {
        const creep = creepActor.object('creep');
        const resource = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES, {
            filter: (resource) => resource.type === RESOURCE_ENERGY
        });
        if (!resource) {
            return this.findSource(creepActor);
        }

        creepActor.scheduleTask(new Fetch({
            priority: this.priority + 1,
            params: {resourceId: resource.id}
        }));
        this.hasFinished = true;
    }

    /**
     * Find a container that holds energy in the room of the given creep and schedule
     * a fetch task, then a new upgrade task.
     * @param {CreepActor} creepActor - the actor who execute this action
     */
    findEnergyContainer(creepActor) {
        const creep = creepActor.object('creep');
        const containers = creep.room.find(FIND_STRUCTURES)
            .filter(s => s.structureType === STRUCTURE_CONTAINER)
            .filter(s => s.store[RESOURCE_ENERGY] > 0);
        if (containers.length === 0) {
            this.findDroppedEnergy(creepActor);
        }
        else {
            const {item} = math.max(containers, (container => container.store[RESOURCE_ENERGY]));
            // TODO: the tasks don't appear to be executed in this order without the priority hack......
            creepActor.scheduleTask(new Fetch({
                priority: this.priority + 1,
                params: {containerId: item.id}
            }));
            this.hasFinished = true;
        }
    }

    execute(creepActor) {
        this.findEnergyContainer(creepActor);
    }

    finished(creepActor) {
        const creep = creepActor.object('creep');
        return this.hasFinished || _.sum(creep.carry) + this.amountFetched >= creep.carryCapacity;
    }

    shortDescription() {
        return '👜';
    }
}

module.exports = SuperFetch;
