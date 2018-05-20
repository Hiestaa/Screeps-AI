const BaseObjective = require('objectives.BaseObjective');
const {
    AT_BUILDING_MANAGER,
    O_MAINTAIN_BUILDINGS,
    AT_CREEP_ACTOR,
    T_BUILD_CONSTRUCTION_SITES,
    A_REPAIR
} = require('constants');
const BuildConstructionSites = require('tasks.manager.BuildConstructionSites');
const Repair = require('tasks.creepActions.Repair');
const logger = require('log').getLogger('objectives.manager.MaintainBuildings', 'white');
const findUtils = require('utils.find');
const lookUtils = require('utils.look');


/**
 * Maintain all buildings in the room associated with the building manager that
 * runs this objective.
 */
class MaintainBuildings extends BaseObjective {
    /**
     * Build the objective
     * @param {Array<{x, y}>} memory.params.containersLocations - location of the
     *        containers, used by the objective to re-schedule construction tasks
     *        in case of destruction
     * @param {Array<{x, y}>} memory.params.extensionsLocations - location of the extensions
     * @param {Intever} roomLevel - level of the room, controls which buildings will
     *        be considered missing.
     * @param {Object} [memory.state] - state for reloading
     */
    constructor({state, params: {containersLocations, extensionsLocations, roomLevel}}={}) {
        super(
            O_MAINTAIN_BUILDINGS, AT_BUILDING_MANAGER,
            {state, params: {containersLocations, extensionsLocations, roomLevel}}, {
                frequency: 5
            }
        );
    }

    findDamagedStructures(builders) {
        const room = builders.object('room');
        return room.find(FIND_MY_STRUCTURES).filter(s => {
            return s.hits < s.hitsMax - 5 && s.hits > 0;
        }).concat(findUtils.findContainers(room, {isDamaged: true}));
    }

    verifyMissingContainers(builders) {
        const room = builders.object('room');
        const containers = findUtils.findContainers(room);
        if (containers.length < this.params.containersLocations.length) {
            logger.info('Detected missing containers');
            builders.scheduleTask(new BuildConstructionSites({
                params: {
                    locations: this.params.containersLocations,
                    structureType: STRUCTURE_CONTAINER
                }
            }));
        }
        else {
            logger.debug(`Found ${containers.length} containers`);
        }
    }

    verifyMissingExtensions(builders) {
        const room = builders.object('room');
        const extensions = findUtils.findExtensions(room);
        if (extensions.length < this.params.extensionsLocations.length) {
            logger.info('Detected missing extensions');
            builders.scheduleTask(new BuildConstructionSites({
                params: {
                    locations: this.params.extensionsLocations,
                    structureType: STRUCTURE_EXTENSION
                }
            }));
        }
        else {
            logger.debug(`Found ${extensions.length} extensions`);
        }
    }

    verifyMissingStructures(builders) {
        if (builders.hasTaskScheduled(T_BUILD_CONSTRUCTION_SITES)) {
            return;
        }
        logger.debug(`Verifying missing structure - controller level=${this.params.roomLevel}`);
        if (this.params.roomLevel >= 1) {
            this.verifyMissingContainers(builders);
        }
        if (this.params.roomLevel >= 2) {
            this.verifyMissingExtensions(builders);
        }
        // TODO: more missing structures as higher levels
    }

    // if any construction site is defined, and pending, schedule a build task
    // this may happen if something unexpected did occur
    verifyPendingConstructionSite(builders) {
        if (builders.hasTaskScheduled(T_BUILD_CONSTRUCTION_SITES)) {
            return;
        }
        const room = builders.object('room');
        logger.debug('Verifying pending construction sites');
        const containers = this.params.containersLocations
            .map(({x, y}) => lookUtils.lookAtConstructionSite(room, x, y))
            .filter(site => !!site);
        if (containers.length > 0) {
            logger.info(`${containers.length} pending construction sites found`);
            builders.scheduleTask(new BuildConstructionSites({
                params: {
                    locations: this.params.containersLocations,
                    structureType: STRUCTURE_CONTAINER
                }
            }));
        }

        // TODO: do the same for extensions and other structrures
    }

    execute(builders) {
        this.verifyPendingConstructionSite(builders);
        this.verifyMissingStructures(builders);

        const damaged = this.findDamagedStructures(builders);
        if (!damaged || !damaged.length) { return logger.debug('No damaged structure.'); }

        let k = 0;

        Object.keys(builders.attachedAgents).forEach(key => {
            const creepActor = builders.attachedAgents[key];

            if (key === 'controller') { return; }
            if (creepActor.type !== AT_CREEP_ACTOR) { return; }

            if (creepActor.hasTaskScheduled(A_REPAIR)) { return; }

            const structure = damaged[k % damaged.length];

            if (!structure) {
                logger.warning(`Pending structure ${k} is undefined`);
            }
            k++;

            creepActor.scheduleTask(new Repair({
                params: {structureId: structure.id},
                priority: 15
            }));
        });
    }
}

module.exports = MaintainBuildings;
