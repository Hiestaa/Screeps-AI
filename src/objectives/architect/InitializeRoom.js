const BaseObjective = require('objectives.BaseObjective');
const {
    O_INITIALIZE_ROOM,
    AT_ARCHITECT,
    O_MAINTAIN_BUILDINGS
} = require('constants');
const {
    getAgentById
} = require('agents.AgentsManager.storage');
const PopulateInitialGroups = require('tasks.architect.PopulateInitialGroups');
const StayFilledUp = require('objectives.manager.StayFilledUp');
const DistributeEnergy = require('objectives.manager.DistributeEnergy');
// const KeepUpgradingController = require('objectives.manager.KeepUpgradingController');
const UpgradeRCL2 = require('objectives.architect.UpgradeRCL2');
const BuildMiningContainers = require('objectives.manager.BuildMiningContainers');
// const ClearRoomThreat = require('objectives.manager.ClearRoomThreat');

/**
 * Initializing a room means essentially building the containers so we can start
 * having more dedicated creeps, while making sure that creeps of the room have
 * a manager assigned that has an objective defined so the creeps don't remain idle.
 * Once the colony has generated enough creeps to get the container structures built,
 * the `UpdateRCL2` objective will be set on the architect.
 */
class InitializeRoom extends BaseObjective {
    /**
     * Build an InitializeRoom objective
     * @param {Object} memory - memory associated with this objective instance
     * @param {Object} memory.params - parameters of this objective instance
     * @param {Array<CONST>} memory.params.initialCreeps - list of creep profiles
     *                       that should be spawned before carrying over to the next objective
     * @param {Object} memory.state - state memory of the objective
     */
    constructor(memory={}) {
        super(O_INITIALIZE_ROOM, AT_ARCHITECT, memory);
        this.state.handledProfiles = this.state.handledProfiles || {};
    }
    execute(architect) {
        if (architect.unassignedCreepActorIds.length > 0) {
            const creepActorIds = architect.unassignedCreepActorIds.splice(0);
            creepActorIds.forEach(caId => {
                const ca = getAgentById(caId);
                this.state.handledProfiles[ca.creepProfile] = (
                    this.state.handledProfiles[ca.creepProfile] || 0) + 1;
            });
            architect.scheduleTask(new PopulateInitialGroups({params: {creepActorIds}}));
        }

        const spawnManager = architect.agent('spawn');
        const sources = architect.getSourceManagers();
        // const defenseGroup = architect.agent('defenseGroup');
        // const controllerManager = architect.agent('controller');
        const builders = architect.agent('builders');

        if (!spawnManager.hasObjective()) {
            spawnManager.setObjective(new StayFilledUp());
        }

        // if (!controllerManager.hasObjective()) {
        //     controllerManager.setObjective(new KeepUpgradingController());
        // }

        sources.forEach(s => {
            if (!s.hasObjective() && !s.isDangerous()) {
                s.setObjective(new DistributeEnergy());
            }
        });

        if (builders && !builders.hasObjective()) {
            builders.setObjective(new BuildMiningContainers({
                params: {locations: architect.getContainerLocations()}
            }));
        }
        else if (builders && builders.hasObjective(O_MAINTAIN_BUILDINGS)) {
            architect.setObjective(new UpgradeRCL2());
        }

        // if (!defenseGroup.hasObjective()) {
        //     // clear room threat will itself lead to garrisons objective once
        //     // the threats are all eliminated
        //     defenseGroup.setObjective(new ClearRoomThreat());
        // }
    }
}

module.exports = InitializeRoom;
