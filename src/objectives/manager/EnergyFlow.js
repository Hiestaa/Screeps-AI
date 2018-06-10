const BaseObjective = require('objectives.BaseObjective');
const {
    O_ENERGY_FLOW,
    AT_LOGISTIC_MANAGER,
    AT_CREEP_ACTOR,
    A_CARRY,
    CP_HAULER
} = require('constants');
const logger = require('log').getLogger('objectives.manager.EnergyFlow', 'white');
const Carry = require('tasks.creepActions.Carry');
const Fetch = require('tasks.creepActions.Fetch');
const lookUtils = require('utils.look');
const findUtils = require('utils.find');

const MIN_ENERGY_MINING_CONTAINER = 500;

/**
 * Let the energy flow from the mining containers to the spawn, extensions, and
 * and (TODO) controller containers by scheduling appropriate Fetch and Carry tasks
 * to the creep actors managed by the logistic manager executing this objective
 */
class EnergyFlow extends BaseObjective {
    /**
     * Initialize the EnergyFlow objective.
     * @param {Object} memory - objective's memory
     * @param {Object} memory.params - objective's parameters
     * @param {Array<{x, y}>} mineContainersPos - list of positions of the mining containers
     * @param {Array<{x, y}>} extensionsPos - list of positions of the extensions
     * @param {Array<{x, y}>} controllerContainersPos - list of positions of the controller containers
     *        The position, rather than the id of the items is given to the objective to
     *        allow initializing the objective before the structures are finilized.
     *        The objective will look at the position of each structure, and won't schedule
     *        any Fetch or Carry task until the structure is found.
     * @param {Object} [memory.state] - current state given when reloading the objective
     */
    constructor({state, params: {mineContainersPos, extensionsPos, controllerContainersPos}}={}) {
        super(O_ENERGY_FLOW, AT_LOGISTIC_MANAGER, {state, params: {
            mineContainersPos,
            extensionsPos,
            controllerContainersPos
        }}, {frequency: 10});
    }

    getContainerAtPos(room, pos) {
        const structure = lookUtils.lookAtStructure(room, pos.x, pos.y);
        if (structure && structure.structureType === STRUCTURE_CONTAINER) {
            return structure;
        }
        return null;
    }

    getExtensionAtPos(room, pos) {
        const structure = lookUtils.lookAtStructure(room, pos.x, pos.y);
        if (structure && structure.structureType === STRUCTURE_EXTENSION) {
            return structure;
        }
        return null;
    }

    // get the constructed mining containers that have energy
    // cache the ids of the containers found at expected positions for faster calls
    getContainersWithEnergy(room, secondCall) {
        const containersHaveEnergy = [];
        if (!this.state.mineContainersIds) {
            this.state.mineContainersIds = {};
        }
        let container;
        for (var i = 0; i < this.params.mineContainersPos.length; i++) {
            if (!this.state.mineContainersIds[i]) {
                container = this.getContainerAtPos(
                    room, this.params.mineContainersPos[i]);
                if (container) {
                    this.state.mineContainersIds[i] = container.id;
                }
            }
            else {
                container = Game.getObjectById(this.state.mineContainersIds[i]);
            }
            if (container && container.store[RESOURCE_ENERGY] > MIN_ENERGY_MINING_CONTAINER) {
                containersHaveEnergy.push(container);
            }
        }

        // if we haven't found any containers, if might be because our cache is outdated
        // call again after having cleared out the cache
        if (containersHaveEnergy.length === 0) {
            // avoid infinite recursion
            if (secondCall) { return containersHaveEnergy; }
            this.state.mineContainersIds = null;
            return this.getContainersWithEnergy(room, true);
        }

        return containersHaveEnergy;
    }

    // get the constructed extensions that need energy
    // cache the ids of the extensions found at expected positions for faster calls
    getExtentionsForRefill(room, secondCall) {
        const extensionsNeedEnergy = [];
        if (!this.state.extensionsIds) {
            this.state.extensionsIds = {};
        }
        let extension;
        for (var i = 0; i < this.params.extensionsPos.length; i++) {
            if (!this.state.extensionsIds[i]) {
                extension = this.getExtensionAtPos(
                    room, this.params.extensionsPos[i]);
                if (extension) {
                    this.state.extensionsIds[i] = extension.id;
                }
            }
            else {
                extension = Game.getObjectById(this.state.extensionsIds[i]);
            }
            if (extension && extension.energy < extension.energyCapacity) {
                extensionsNeedEnergy.push(extension);
            }
        }

        // if we haven't found any extension, if might be because our cache is outdated
        // call again after having cleared out the cache
        if (extensionsNeedEnergy.length === 0) {
            // avoid infinite recursion
            if (secondCall) { return extensionsNeedEnergy; }
            this.state.extensionsIds = null;
            return this.getExtentionsForRefill(room, true);
        }

        return extensionsNeedEnergy;
    }

    // get the constructed controller containers that need energy
    // cache the ids of the containers found at expected positions for faster calls
    getContainersForRefill(room, secondCall) {
        const containersNeedEnergy = [];
        if (!this.state.controllerContainersIds) {
            this.state.controllerContainersIds = {};
        }
        let container;
        for (var i = 0; i < this.params.controllerContainersPos.length; i++) {
            if (!this.state.controllerContainersIds[i]) {
                container = this.getContainerAtPos(
                    room, this.params.controllerContainersPos[i]);
                if (container) {
                    this.state.controllerContainersIds[i] = container.id;
                }
            }
            else {
                container = Game.getObjectById(this.state.controllerContainersIds[i]);
            }
            if (container && _.sum(container.store) < container.storeCapacity) {
                containersNeedEnergy.push(container);
            }
        }

        // if we haven't found any container, if might be because our cache is outdated
        // call again after having cleared out the cache
        if (containersNeedEnergy.length === 0) {
            // avoid infinite recursion
            if (secondCall) { return containersNeedEnergy; }
            this.state.controllerContainersIds = null;
            return this.getExtentionsForRefill(room, true);
        }

        return containersNeedEnergy;
    }

    scheduleFetchCarryTasks(creepActor, {containerId, resourceId}, depositId) {
        creepActor.scheduleTask(new Fetch({priority: 10, params: {
            containerId, resourceId
        }}));
        creepActor.scheduleTask(new Carry({priority: 5, params: {
            depositId
        }}));
    }

    getRoamingCreepActors(logisticManager) {
        const alreadyScheduledDepositIds = new Set();
        const roamingCreepActors = [];

        Object.keys(logisticManager.attachedAgents).forEach(key => {
            const creepActor = logisticManager.agent(key);

            if (creepActor.type !== AT_CREEP_ACTOR) { return; }
            if (creepActor.creepProfile !== CP_HAULER) { return; }

            let carryTask = creepActor.getScheduledTask(A_CARRY);
            if (carryTask) {
                alreadyScheduledDepositIds.add(carryTask.params.depositId);
            }
            else {
                roamingCreepActors.push(creepActor);
            }
        });

        return {
            alreadyScheduledDepositIds,
            roamingCreepActors
        };
    }

    /**
     * The execution proceeds as follow:
     * 1. Look for the containers and extensions positions for a constructed structure
     *    at the designated positions.
     * 2. From the list of constructed structures, retain the ones that have, or need energy
     * 3. From the list of structure that need energy, exclude the ones that
     *    already have a creep tasked to carry energy back
     * 4. For each remaining structure, pick a roaming / free hauler to fetch
     *    energy from a non-empty mining container and carry it back.
     */
    execute(logisticManager) {
        const room = logisticManager.object('room');
        const spawnsNeedEnergy = findUtils.findSpawns(room, {needsEnergy: true});
        const containersNeedEnergy = this.getContainersForRefill(room);
        const extensionsNeedEnergy = this.getExtentionsForRefill(room);
        const containersHaveEnergy = this.getContainersWithEnergy(room);
        // TODO: include a look up of tombstone and dropped energy as a primary FETCH source

        logger.debug(
            `EnergyFlow: \n\t${containersHaveEnergy.length} containers -> ` +
            `\n\t\t -> ${spawnsNeedEnergy.length} spawns` +
            `\n\t\t -> ${extensionsNeedEnergy.length} extensions` +
            `\n\t\t -> ${containersNeedEnergy.length} containers`);

        if (containersHaveEnergy.length === 0) {
            logger.info(`No mining container storing energy in room ${room.name}`);
            return;
        }

        let [j, k, l, m] = [0, 0, 0, 0, 0];

        const {
            alreadyScheduledDepositIds,
            roamingCreepActors
        } = this.getRoamingCreepActors(logisticManager);

        if (roamingCreepActors.length === 0) {
            logger.info(`No roaming creep actors found attached to logistic manager (room=${room.name})`);
            return;
        }

        const nextContainerWithEnergy = () => {
            const c = containersHaveEnergy[j];
            j = (j + 1) % containersHaveEnergy.length;
            return c;
        };

        const nextDeposit = () => {
            if (k < spawnsNeedEnergy.length) {
                return spawnsNeedEnergy[k++];
            }

            if (l < extensionsNeedEnergy.length) {
                return extensionsNeedEnergy[l++];
            }

            if (m < containersNeedEnergy.length) {
                return containersNeedEnergy[m++];
            }

            return null;
        };

        const stillRoamingCreepActors = [];

        roamingCreepActors.forEach(creepActor => {
            const container = nextContainerWithEnergy();
            const deposit = nextDeposit();

            if (!deposit || alreadyScheduledDepositIds.has(deposit.id)) {
                stillRoamingCreepActors.push(creepActor);
            }
            else if (!container) {
                console.log('wtf no container, containersHaveEnergy.length=' + containersHaveEnergy.length + ', j=' + j);
            }
            else {
                console.log('container', container);
                this.scheduleFetchCarryTasks(
                    creepActor, {containerId: container.id}, deposit.id);
            }
        });

        if (stillRoamingCreepActors.length) {
            logger.info(`Still ${stillRoamingCreepActors.length} roaming haulers`);
            // TODO: assign them a roaming task, if they don't have one already,
            // so they keep moving or are moving towards a specific point where they won't be in the way
            // (ideally, along a road if there is one, to save time when we need the hauler to work again)
        }
    }
}

module.exports = EnergyFlow;
