const BaseManager = require('agents.BaseManager');
const {
    AT_SOURCE_MANAGER
} = require('constants');
const logger = require('log').getLogger('agents.SourceManager', '#CCFF00');

/**
 * If a hostile creep or structure is discovered at less than the following
 * distance from the source, it is considered a threat and the source will not
 * be considered to have any mining spot.
 */
const DISTANCE_THREAT = 10;

/**
 * The SourceManager is instanciated on request of an architect and deals with
 * the concern of guiding creeps to the source, making sure they don't prevent each other
 */
class SourceManager extends BaseManager {
    /**
     * Initialize the building manager
     * @param {Source} source - the source this manager is attached to
     * @param {Array} creepActorIds - list of ids of creep actors that should
     *                be managed by this agent
     */
    initialize(source, creepActorIds=[]) {
        super.initialize(`SourceManager R${source.room.name}-${source.id.toString().slice(0, 2)}`,
            AT_SOURCE_MANAGER, creepActorIds, {}, {
                source: source.id
            }
        );
        this.nbMiningSpots = null;
        this.danger = null;
    }

    load(state) {
        super.load(state);
        this.nbMiningSpots = state.nbMiningSpots;
        this.danger = state.danger;
    }

    save(state) {
        super.save(state);
        state.nbMiningSpots = this.nbMiningSpots;
        state.danger = this.danger;
    }

    /**
     * CPU expensive function that will look at the area around the source
     * to find the list of mining spots.
     */
    findMiningSpots() {
        if (this.danger) { return []; }
        const source = this.object('source');

        this.danger = this.isDangerous();
        if (this.danger) {
            this.nbMiningSpots = 0;
            logger.debug(`${this.name} (sourceId=${source.id}) has danger threatening the mining spot.`);
            return [];
        }

        const miningSpots = source.room.lookAtArea(
            source.pos.y - 1, source.pos.x - 1,
            source.pos.y + 1, source.pos.x + 1, true
        ).filter((lookObj) => {
            return (
                lookObj.type === LOOK_TERRAIN &&
                lookObj[lookObj.type] !== 'wall'
            );
        }).map(lookObj => {
            return {x: lookObj.x, y: lookObj.y};
        });
        this.nbMiningSpots = miningSpots.length;

        return miningSpots;
    }

    /**
     * Get the number of mining spots on the attached source.
     * The number of mining spots is the number of non-wall terrain around the source.
     * The result is memorized so calling this function multiple times doesn't
     * lead to unecessary duplicated computations.
     * @return {Integer} - the number of mining spots
     */
    getNbMiningSpots() {
        // TODO: this will remain 0 forever if a threat is detected near the source
        // we should recompute that from time to time (e.g: upon requests?) so
        // that the apparition or destruction of an enemy can be reacted upon
        if (this.nbMiningSpots !== null) { return this.nbMiningSpots; }
        if (this.danger) { return 0; }

        const source = this.object('source');
        const miningSpots = this.findMiningSpots();
        this.nbMiningSpots = miningSpots.length;

        logger.debug(`${this.name} (sourceId=${source.id}) has ${this.nbMiningSpots} mining spots.`);
        return this.nbMiningSpots;
    }

    isDangerous() {
        if (this.danger !== null) { return this.danger; }
        const source = this.object('source');
        this.danger = source.room.find(FIND_HOSTILE_STRUCTURES)
            .concat(source.room.find(FIND_HOSTILE_CREEPS))
            .some(threat => threat.pos.inRangeTo(source.pos, DISTANCE_THREAT));
        return this.danger;
    }
}

module.exports = SourceManager;
