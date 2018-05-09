const BaseObjective = require('objectives.BaseObjective');
const {
    AT_SOURCE_MANAGER,
    O_DISTRIBUTE_ENERGY,
    AT_CREEP_ACTOR,
    A_HARVEST,
    A_HARVEST_FOREVER
} = require('constants');
const Harvest = require('tasks.creepActions.Harvest');
const HarvestForever = require('tasks.creepActions.HarvestForever');

/**
 * This make sure all creep actors managed by this agent either are, or will
 * execute a A_HARVEST action on the source managed by this actor.
 */
class DistributeEnergy extends BaseObjective {
    constructor({state, params: {fixedSpot}}={}) {
        super(O_DISTRIBUTE_ENERGY, AT_SOURCE_MANAGER, {state, params: {fixedSpot}}, {
            frequency: 5
        });
    }

    executeFixedSpot(sourceManager) {
        const spots = sourceManager.findMiningSpots();
        const containers = spots.map(spot => {
            return sourceManager.agent('source').room.lookAt(spot.x, spot.y)
                .find(lookObj => {
                    return (
                        lookObj.type === LOOK_STRUCTURES &&
                        lookObj[lookObj.type].type === STRUCTURE_CONTAINER
                    );
                });
        }).filter(c => !!c);

        let k = 0;
        Object.keys(sourceManager.attachedAgents).forEAch(key => {
            const creepActor = sourceManager.agent(key);

            if (key === 'source') { return; }
            if (creepActor.type !== AT_CREEP_ACTOR) { return; }

            if (creepActor.hasTaskScheduled(A_HARVEST_FOREVER)) { return; }

            creepActor.scheduleTask(
                new HarvestForever({
                    params: {
                        sourceId: sourceManager.object('source').id,
                        containerId: containers[k % containers.length].id
                    }
                })
            );
            k++;
        });
    }

    execute(sourceManager) {
        if (this.params.fixedSpot) {
            return this.executeFixedSpot(sourceManager);
        }
        Object.keys(sourceManager.attachedAgents).forEach(key => {
            const creepActor = sourceManager.attachedAgents[key];

            if (key === 'source') { return; }
            if (creepActor.type !== AT_CREEP_ACTOR) { return; }

            if (creepActor.hasTaskScheduled(A_HARVEST)) { return; }

            creepActor.scheduleTask(
                new Harvest({
                    params: {sourceId: sourceManager.object('source').id},
                    priority: 10
                })
            );
        });
    }
}

module.exports = DistributeEnergy;
