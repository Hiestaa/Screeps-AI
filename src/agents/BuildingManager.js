const BaseManager = require('agents.BaseManager');
const {
    AT_BUILDING_MANAGER
} = require('constants');

/**
 * The BuildingManager is instanciated on request of an architect and deals
 * with the concern of getting construction sites completed and constructed
 * building efficiently maintained and protected.
 * It is attached to a list of construction site game objects and manages a
 * list of creep and building actors.
 */
class BuildingManager extends BaseManager {
    constructor(id) {
        super(id);
        this.nbBuildingActors = 0;
    }

    /**
     * Initialize the building manager
     * @param {Room} room - room object this building manager is attached to
     * @param {Array} creepActorIds - list of ids of creep actors that should
     *                be managed by this agent
     * @param {Array} constructionSiteIds - list of ids of construction sites
     *                this building manager should take care of completing and maintaining.
     */
    initialize(room, creepActorIds=[], constructionSiteIds=[]) {
        constructionSiteIds = constructionSiteIds || [];
        const attachedGameObjectIds = {};
        for (var i = 0; i < constructionSiteIds.length; i++) {
            attachedGameObjectIds[`constructionSite_${i}`] = constructionSiteIds[i];
        }
        super.initialize(
            'BuildingManager R' + room.name, AT_BUILDING_MANAGER,
            creepActorIds, {room: room.name}, attachedGameObjectIds);
    }

    findGameObject(key, val) {
        if (key === 'room') {
            return Game.rooms[val];
        }
        return Game.getObjectById(val);
    }

    load(state) { super.load(state); this.nbBuildingActors = state.nbBuildingActors; }

    save(state) { super.save(state); state.nbBuildingActors = this.nbBuildingActors; }
}

module.exports = BuildingManager;
