const BaseObjective = require('objectives.BaseObjective');
const {
    AT_BUILDING_MANAGER,
    O_BUILD_MINING_CONTAINERS,
    AT_CREEP_ACTOR,
    A_BUILD
} = require('constants');
const Build = require('tasks.creepActions.Build');
const MaintainBuildings = require('objectives.manager.MaintainBuildings');
const logger = require('log').getLogger('objectives.manager.BuildMiningContainers', 'white');
/**
 * The BuildMiningContainers objective creates the construction sites for containers
 * at all available mining positions.
 * It then schedules A_BUILD tasks periodically to let the creeps it controls
 * finilize the contstruction.
 */
class BuildMiningContainers extends BaseObjective {
    constructor({state, params: {locations}}) {
        super(
            O_BUILD_MINING_CONTAINERS, AT_BUILDING_MANAGER,
            {state, params: {locations}}, {
                frequency: 5
            }
        );
    }

    getPendingConstructionSites() {
        const room = this.object('room');
        this.state.pending = this.state.pending || Array.from(this.params.locations);
        return this.state.pending
            .map(({x, y}) => {
                const sites = room.lookAt(x, y).filter(lookObj => {
                    return lookObj.type === LOOK_CONSTRUCTION_SITES;
                });
                if (sites.length === 0) { return null; }
                return sites[0];
            })
            .filter(site => !!site);
    }

    findConstructionSites() {
        const room = this.object('room');
        this.params.locations
            .map(({x, y}) => {
                const sites = room.lookAt(x, y).filter(lookObj => {
                    return lookObj.type === LOOK_CONSTRUCTION_SITES;
                });
                if (sites.length === 0) { return null; }
                return sites[0];
            })
            .filter(site => !!site);
    }

    execute(builders) {
        const room = this.object('room');
        // state 1: haven't created sites yet. Do so now.
        if (!this.state.sitesCreated) {
            this.params.locations.forEach(({x, y}) => {
                const code = room.createConstructionSite(x, y, STRUCTURE_CONTAINER);
                if (code !== OK) {
                    logger.failure(code, `Unable to create construction site at {x: ${x}, y: ${y}}`);
                }
            });
            this.state.sitesCreated = true;
        }

        // state 2: waiting to see the sites pop in the game state
        if (!this.state.sitesFound) {
            const allSites = this.findConstructionSites();
            this.state.sitesFound = allSites.length > 0;
            if (!this.state.sitesFound) { return; }
        }

        // state 3: construction sites have been found - schedule build actions for
        // the pending ones.
        const pending = this.getPendingConstructionSites();
        if (pending.length === 0) {
            builders.setObjective(new MaintainBuildings());
        }
        let k = 0;

        Object.keys(builders.attachedAgents).forEach(key => {
            const creepActor = builders.attachedAgents[key];

            if (key === 'controller') { return; }
            if (creepActor.type !== AT_CREEP_ACTOR) { return; }

            if (creepActor.hasTaskScheduled(A_BUILD)) { return; }

            const site = pending[k % pending.length];
            k++;

            creepActor.scheduleTask(new Build({
                params: {siteId: site.id},
                priority: 15
            }));
        });
    }
}

module.exports = BuildMiningContainers;
