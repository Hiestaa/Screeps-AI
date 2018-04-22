const BaseAgent = require('agents.BaseAgent');
const SourceManager = require('agents.SourceManager');
const SpawnManager = require('agents.SpawnManager');
// const BuildingManager = require('agents.BuildingManager');
const ControllerManager = require('agents.ControllerManager');
const logger = require('log').getLogger('agents.Architect', '#0E9800');

const {
    AT_ARCHITECT
} = require('constants');

/**
 * The architect is instanciated on request of the colony,
 * is attached to a particular room and manages a list of managers.
 */
class Architect extends BaseAgent {
    /**
     * Initialize the architect to a working state.
     * * Declare member variables
     * * Instanciate the initial agents present in the room
     *   (sources, controller and spawn manager)
     * @param {Room} - the room this architect is attached to
     */
    initialize(room) {
        super.initialize(
            `Architect ${room.name}`, AT_ARCHITECT,
            {}, {room: room.id});

        // when creeps appear in the room without assigned to a manager,
        // they are added to this array so the architect can assign them
        // to whatever group is relevant depending on the task executed
        this.unassignedCreepActorIds = [];
        this.nbMiningSpots = null;

        const sources = room.find(FIND_SOURCES);
        sources.forEach((source, idx) => {
            const sourceManager = new SourceManager();
            sourceManager.initialize(source);
            this.attachAgent(`source_${idx}`, sourceManager);
        });

        const structures = room.find(FIND_STRUCTURES);
        structures.forEach(structure => {
            if (structure.type === STRUCTURE_SPAWN) {
                const spawn = new SpawnManager();
                spawn.initialize(structure);
                this.attachAgent('spawn', spawn);
            }
            else if (structure.tye === STRUCTURE_CONTROLLER) {
                const controller = new ControllerManager();
                controller.initialize(structure);
                this.attachAgent('controller', controller);
            }
        });

        // many BuildingManager will be attached to this agent as deemed
        // necessary by the executed tasks, these don't exist yet at the initialization phase.
    }

    save(state) {
        super.save(state);
        state.unassignedCreepActorIds = this.unassignedCreepActorIds;
        state.nbMiningSpots = this.nbMiningSpots;
    }

    load(state) {
        super.load(state);
        // restore the assigned creep actor from saved id
        this.unassignedCreepActorIds = state.unassignedCreepActorIds;
        this.nbMiningSpots = state.nbMiningSpots;
    }

    /**
     * When a new creep actor is created without a group assigned,
     * whether it just got spawned or just entered the room, this function is
     * called.
     * Some objective will look at this property to assign the agent to the
     * appropriate group.
     */
    handleNewAgent(creepActor) {
        this.unassignedCreepActorIds.push(creepActor.id);
    }

    /**
     * Return an array of source managers attached to this architect.
     * @return {Array<SourceManager>} - source managers
     */
    getSourceManagers() {
        return Object.keys(this.attachedAgents)
            .filter(k => k.startsWith('source_'))
            .map(k => this.agent(k));
    }
    /**
     * Count the number of mining spots available in all the sources of this room.
     * A mining spot is a non-wall terrain next to a source.
     * @return {Integer} the number of mining spots
     */
    countMiningSpots() {
        const room = this.object('room');
        if (this.nbMiningSpots !== null) {
            logger.debug(`Architect (room=${room}) has ${this.nbMiningSpots} mining spots.`);
            return this.nbMiningSpots;
        }
        this.nbMiningSpots = _.sum(
            Object.keys(this.attachedAgents)
                .filter(k => k.startsWith('source_'))
                .map(k => this.agent(k))
                .map(s => s.getNbMiningSpots()));
        logger.debug(`Architect (room=${room}) has ${this.nbMiningSpots} mining spots.`);
        return this.nbMiningSpots;
    }
}

module.exports = Architect;