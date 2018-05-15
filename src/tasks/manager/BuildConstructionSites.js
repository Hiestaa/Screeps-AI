const BaseTask = require('tasks.BaseTask');
const {
    AT_BUILDING_MANAGER,
    T_BUILD_CONSTRUCTION_SITES,
    AT_CREEP_ACTOR,
    A_BUILD
} = require('constants');
const Build = require('tasks.creepActions.Build');
const lookUtils = require('utils.look');
const logger = require('log').getLogger('tasks.manager.BuildConstructionSites', 'white');
/**
 * The BuildConstructionSites objective creates the construction sites for of
 * the defined type at all available mining positions.
 * It then schedules A_BUILD tasks periodically to let the creeps it controls
 * finilize the contstruction.
 */
class BuildConstructionSites extends BaseTask {
    constructor({state, params: {locations, structureType}, priority}={}) {
        super(
            T_BUILD_CONSTRUCTION_SITES, AT_BUILDING_MANAGER,
            {state, params: {locations, structureType}, priority}, {
                frequency: 5
            }
        );
        this.hasFinished = false;
    }

    getPendingConstructionSites(room) {
        this.state.pending = this.state.pending || Array.from(this.params.locations);
        return this.state.pending
            .map(({x, y}) => {
                const sites = room.lookAt(x, y).filter(lookObj => {
                    return lookObj.type === LOOK_CONSTRUCTION_SITES;
                }).map(lookObj => lookObj[lookObj.type]);
                if (sites.length === 0) { return null; }
                // ignore sites that have almost completed progress
                // this is done to avoid creeps from getting stucks in the sim room
                // failing to buid the same construction site over and over again.
                if (sites[0].progress >= sites[0].progressTotal - 5) { return null; }
                return sites[0];
            })
            .filter(site => !!site);
    }

    findConstructionSites(room) {
        return this.params.locations
            .map(({x, y}) => lookUtils.lookAtConstructionSite(room, x, y))
            .filter(site => !!site);
    }

    execute(builders) {
        const room = builders.object('room');
        // state 1: haven't created sites yet. Do so now.
        if (!this.state.sitesCreated) {
            this.params.locations.forEach(({x, y}) => {
                const code = room.createConstructionSite(x, y, this.params.structureType);
                if (code !== OK) {
                    logger.failure(code, `Unable to create construction site at {x: ${x}, y: ${y}}`);
                }
            });
            this.state.sitesCreated = true;
        }

        // state 2: waiting to see the sites pop in the game state
        if (!this.state.sitesFound) {
            const allSites = this.findConstructionSites(room);
            this.state.sitesFound = allSites.length > 0;
            if (!this.state.sitesFound) { return; }
        }

        // state 3: construction sites have been found - schedule build actions for
        // the pending ones.
        const pending = this.getPendingConstructionSites(room);
        if (pending.length === 0) {
            this.hasFinished = true;
        }
        let k = 0;
        Object.keys(builders.attachedAgents).forEach(key => {
            const creepActor = builders.attachedAgents[key];

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

    finished() {
        return this.hasFinished;
    }
}

module.exports = BuildConstructionSites;
