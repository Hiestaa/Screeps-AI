const BaseObjective = require('objectives.BaseObjective');
const {
    AT_SOURCE_MANAGER,
    O_DISTRIBUTE_ENERGY,
    AT_CREEP_ACTOR,
    A_HARVEST,
    A_HARVEST_FOREVER,
    CP_HARVESTER
} = require('constants');
const Harvest = require('tasks.creepActions.Harvest');
const HarvestForever = require('tasks.creepActions.HarvestForever');
const logger = require('log').getLogger('objectives.manager.DistributeEnergy', 'white');

/**
 * This make sure all creep actors managed by this agent either are, or will
 * execute a A_HARVEST action on the source managed by this actor.
 */
class DistributeEnergy extends BaseObjective {
    constructor({state, params: {fixedSpot}={}}={}) {
        super(O_DISTRIBUTE_ENERGY, AT_SOURCE_MANAGER, {state, params: {fixedSpot}}, {
            frequency: 5
        });
    }

    // find the id of the containers around the source
    findContainerIds(sourceManager) {
        const spots = sourceManager.findMiningSpots();
        const spotsContainers = spots.map(spot => {
            const lookObj = sourceManager.object('source').room.lookAt(spot.x, spot.y)
                .find(lookObj => {
                    return (
                        lookObj.type === LOOK_STRUCTURES &&
                        lookObj[lookObj.type].structureType === STRUCTURE_CONTAINER
                    );
                });
            if (!lookObj) { return; }
            return lookObj[lookObj.type];
        });

        const filtered = spotsContainers.filter(c => !!c);
        if (!filtered) { return []; }

        return filtered.map(c => c.id);
    }

    execute(sourceManager) {
        const source = sourceManager.object('source');
        if (!this.state.containerId || Game.time % 100 === 0) {

            this.state.containerIds = this.findContainerIds(sourceManager);
            logger.info(`Found ${this.state.containerIds.length} containers around source ${source.id}`);
        }

        const containers = this.state.containerIds;

        let k = 0;

        Object.keys(sourceManager.attachedAgents).forEach(key => {
            const creepActor = sourceManager.agent(key);

            if (creepActor.type !== AT_CREEP_ACTOR) { return; }

            if (creepActor.hasTaskScheduled(A_HARVEST_FOREVER)) { return; }
            if (creepActor.hasTaskScheduled(A_HARVEST)) { return; }

            // don't schedule harvest forever on creeps that aren't harvester
            if (creepActor.creepProfile === CP_HARVESTER && containers && containers.length) {
                creepActor.scheduleTask(
                    new HarvestForever({
                        params: {
                            sourceId: source.id,
                            containerId: containers[k % containers.length]
                        }
                    })
                );
                k++;
            }
            else {
                creepActor.scheduleTask(
                    new Harvest({
                        params: {sourceId: sourceManager.object('source').id},
                        priority: 10
                    })
                );
            }
        });    }
}

module.exports = DistributeEnergy;
