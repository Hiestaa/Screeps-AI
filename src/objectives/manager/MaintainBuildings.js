const BaseObjective = require('objectives.BaseObjective');
const {
    AT_BUILDING_MANAGER,
    O_MAINTAIN_BUILDINGS,
    AT_CREEP_ACTOR,
    A_BUILD,
    O_BUILD_MINING_CONTAINERS
} = require('constants');
const Repair = require('tasks.creepActions.Repair');
const logger = require('log').getLogger('objectives.manager.MaintainBuildings', 'white');

// THat's really bad. Like, reaaaaaally really bad. It's 3am and don't wanna create a circular dependency :D
class _BuildMiningContainers extends BaseObjective {
    constructor({state, params: {locations}}={}) {
        super(
            O_BUILD_MINING_CONTAINERS, AT_BUILDING_MANAGER,
            {state, params: {locations}}, {
                frequency: 5
            }
        );
    }
}

/**
 * Maintain all buildings in the room associated with the building manager that
 * runs this objective.
 * This is the default objective that all other non-permanent objectives should
 * lead to.
 */
class MaintainBuildings extends BaseObjective {
    // locations are retained, so we can verify missing strctures and
    // reschedule build task as necessary
    constructor({state, params: {locations}}={}) {
        super(
            O_MAINTAIN_BUILDINGS, AT_BUILDING_MANAGER,
            {state, params: {locations}}, {
                frequency: 5
            }
        );
    }

    findDamagedStructures(builders) {
        const room = builders.object('room');
        return room.find(FIND_MY_STRUCTURES).filter(s => {
            return s.hits < s.hitsMax - 5 && s.hits > 0;
        }).concat(room.find(FIND_MY_STRUCTURES).filter(s => {
            return s.structureType === STRUCTURE_CONTAINER && s.hits < s.hitsMax - 5 && s.hits > 0;
        }));
    }

    verifyMissingContainers(builders) {
        const room = builders.object('room');
        if (this.params.locations && room.find(FIND_MY_STRUCTURES).filter(s => {
            return s.structureType === STRUCTURE_CONTAINER;
        }).length === 0) {
            builders.scheduleTask(new _BuildMiningContainers({
                params: this.params
            }));
        }
    }

    verifyMissingStructures(builders) {
        const room = builders.object('room');
        if (room.controller.level > 0) {
            this.verifyMissingContainers(builders);
        }
        // TODO: more missing structures.
    }

    execute(builders) {
        const pending = this.findDamagedStructures(builders);
        if (!pending || !pending.length) { return; }

        let k = 0;

        Object.keys(builders.attachedAgents).forEach(key => {
            const creepActor = builders.attachedAgents[key];

            if (key === 'controller') { return; }
            if (creepActor.type !== AT_CREEP_ACTOR) { return; }

            if (creepActor.hasTaskScheduled(A_BUILD)) { return; }

            const structure = pending[k % pending.length];

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
