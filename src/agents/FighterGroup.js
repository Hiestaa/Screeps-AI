const BaseManager = require('agents.BaseManager');
const {
    AT_FIGHTER_GROUP
} = require('constants');
// const logger = require('log').getLogger('agents.FighterGroup', '#FF3C00');

/**
 * The FighterGroup is instanciated on request of an architect and deals with
 * the concern of guiding creeps to the source, making sure they don't prevent each other
 */
class FighterGroup extends BaseManager {
    /**
     * Initialize the fighter group.
     * Fighter groups operate in the room they are assigned to. To move a fighter
     * group from one room to another it needs to execute a MOVE_GROUP task.
     * There might be some MultiroomFighterGroup later on that can operate on
     * larger scale.
     * @param {Room} room - the room object this fighter group is initialized in
     * @param {string} [name='FighterGroup'] - name of the actor
     * @param {Array} [creepActorIds=[]] - list of ids of creep actors that should
     *                be managed by this agent
     */
    initialize(room, name=null, creepActorIds=[]) {
        super.initialize(name || 'FighterGroup',
            AT_FIGHTER_GROUP, creepActorIds, {}, {
                initialRoom: room.name,
                currentRoom: room.name
            }
        );
    }

    findGameObject(key, val) {
        if (key === 'currentRoom' || key === 'initialRoom') {
            return Game.rooms[val];
        }
        return Game.getObjectById(val);
    }

    load(state) { super.load(state); }

    save(state) { super.save(state); }
}

module.exports = FighterGroup;
