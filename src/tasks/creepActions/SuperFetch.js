const BaseCreepAction = require('tasks.creepActions.BaseCreepAction');
const {
    A_SUPERFETCH,
    CP_WORKER,
    CP_HAULER
} = require('constants');
const Fetch = require('tasks.creepActions.Fetch');
const Harvest = require('tasks.creepActions.Harvest');
const logger = require('log').getLogger('tasks.creepActions.SuperFetch', '#F4C300');
const findUtils = require('utils.find');

/**
 * Fetch energy from a container, a dropped energy, or harvest from a source.
 * TODO: include the possiblilty to fetch primarily from an existing gravestone
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
        const source = creep.room.findClosestByRange(FIND_SOURCES_ACTIVE);
        if (!source) {
            logger.error(
                'No energy container or source to harvest from - ' + creep.name +
                ' is unable to upgrade controller of room: ' + creep.room.name);
            return;
        }

        creepActor.scheduleTask(new Harvest({
            priority: this.priority + 1,
            params: {sourceId: source.id}
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
        const container = findUtils.findClosestContainer(creep.pos, {hasEnergy: true});
        if (!container) {
            logger.info('No container found - Looking for source to harvest from.');
            return this.findSource(creepActor);
        }
        // TODO: the tasks don't appear to be executed in this order without the priority hack......
        creepActor.scheduleTask(new Fetch({
            priority: this.priority + 1,
            params: {containerId: container.id}
        }));
        this.hasFinished = true;
    }

    findDroppedEnergy(creepActor) {
        const creep = creepActor.object('creep');
        const resource = findUtils.findClosestDroppedEnergy(creep.pos, {
            minAmount: creepActor.carryCapacity()
        });

        if (!resource) {
            logger.info('No resource found - looking for energy container');
            return this.findEnergyContainer(creepActor);
        }

        creepActor.scheduleTask(new Fetch({
            priority: this.priority + 1,
            params: {resourceId: resource.id}
        }));
        this.hasFinished = true;
    }

    execute(creepActor) {
        logger.debug('Looking for dropped energy.');
        this.findDroppedEnergy(creepActor);
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
