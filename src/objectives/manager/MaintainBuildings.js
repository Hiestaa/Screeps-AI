const BaseObjective = require('objectives.BaseObjective');
const {
    AT_BUILDING_MANAGER,
    O_MAINTAIN_BUILDINGS,
    AT_CREEP_ACTOR,
    A_BUILD
} = require('constants');
const Repair = require('tasks.creepActions.Repair');
const logger = require('log').createLogger('objectives.manager.MaintainBuildings', 'white');
/**
 * Maintain all buildings in the room associated with the building manager that
 * runs this objective.
 * This is the default objective that all other non-permanent objectives should
 * lead to.
 */
class MaintainBuildings extends BaseObjective {
    constructor(memory={}) {
        super(
            O_MAINTAIN_BUILDINGS, AT_BUILDING_MANAGER,
            memory, {
                frequency: 5
            }
        );
    }

    findDamagedStructures(builders) {
        const room = builders.object('room');
        return room.find(FIND_MY_STRUCTURES).filter(s => {
            return s.hits < s.hitsMax && s.hits > 0;
        });
    }

    execute(builders) {
        const pending = this.findDamagedStructures();
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
