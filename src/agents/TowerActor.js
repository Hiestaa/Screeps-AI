const BaseAgent = require('agents.BaseAgent');
const {
    AT_TOWER_ACTOR
} = require('constants');

/**
 * The tower actor is created to control the behavior of a tower.
 * It does not manage any agent in itself
 */
class TowerActor extends BaseAgent {
    /**
     * Initialize this actor
     * @param {Tower} tower - a tower structure
     */
    initialize(tower) {
        super(`TowerActor ${tower.id}`, AT_TOWER_ACTOR,
            {}, {tower: tower.id});
    }
}

module.exports = TowerActor;
