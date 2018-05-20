const BaseManager = require('agents.BaseManager');
const {
    AT_LOGISTIC_MANAGER
} = require('constants');
const logger = require('log').getLogger('agents.LogisticManager', 'white');

/**
 * The LogisticManager is instanciated on request of an architect and deals
 * with the concern of hauling resources to refill the managed spawn, extensions
 * and containers.
 */
class LogisticManager extends BaseManager {
    constructor(id) {
        super(id);
    }

    /**
     * Initialize the building manager
     * @param {Room} room - room object this building manager is attached to
     * @param {Array} creepActorIds - list of ids of creep actors that should
     *                be managed by this agent. These should be of the creep profile
     *                CP_HAUL or at least have a CARRY body part
     * @param {Array} constructionSiteIds - list of ids of construction sites
     *                this building manager should take care of completing and maintaining.
     */
    initialize(room, creepActorIds=[]) {
        const attachedGameObjectIds = {
            room: room.name
        };
        super.initialize(
            'LogisticManager R' + room.name, AT_LOGISTIC_MANAGER,
            creepActorIds, {}, attachedGameObjectIds);
        // lists of keys of objects that can be found in the `attachetGameObjects` mapping
        this.depositsCategories = {
            'spawns': [],
            'extensions': [],
            'containers': [],
        };
        this.sources = [];
    }

    findGameObject(key, val) {
        if (key === 'room') {
            return Game.rooms[val];
        }
        return Game.getObjectById(val);
    }

    load(state) {
        super.load(state);
        this.depositsCategories = state.depositsCategories;
    }

    save(state) {
        super.save(state);
        state.depositsCategories = this.depositsCategories;
    }

    /**
     * Designate a new energy source from which the manager haulers should carry
     * the energy to the deposits for refill.
     * This is not a source to harvest from. This is a source from which the agent
     * is able to execute `withdraw` (a container, or a dropped resource)
     * @param {GameObject} source - object from which hauler should be able to `withdraw` energy
     */
    designateSource(source) {
        const key = `source_${this.sources.length}`;
        this.attachObject(key, source);
        this.sources.push(key);
    }

    /**
     * Designate a new energy storage structure to which the managed haulers should
     * carry the energy they fetch from one of the designated sources.
     * @param {GameObject} deposit - object to which haulers should be able to `transfer` energy
     */
    designateDeposit(deposit) {
        const type = (deposit.structureType === STRUCTURE_CONTAINER
            ? 'container'
            : deposit.structureType === STRUCTURE_EXTENSION
                ? 'extension'
                : deposit.structureType === STRUCTURE_SPAWN
                    ? 'spawn'
                    : null);
        if (!type) {
            logger.warning(`Unrecognized deposit structure type: ${deposit.structureType}`);
        }
    }
}

module.exports = LogisticManager;
