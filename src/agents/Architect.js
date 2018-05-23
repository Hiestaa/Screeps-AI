const BaseAgent = require('agents.BaseAgent');
const SourceManager = require('agents.SourceManager');
const SpawnManager = require('agents.SpawnManager');
// const BuildingManager = require('agents.BuildingManager');
const ControllerManager = require('agents.ControllerManager');
const BuildingManager = require('agents.BuildingManager');
const FighterGroup = require('agents.FighterGroup');
const LogisticManager = require('agents.LogisticManager');
const logger = require('log').getLogger('agents.Architect', '#0E9800');
const layoutsUtils = require('utils.layouts');
const InitializeRoom = require('objectives.architect.InitializeRoom');

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
            {}, {room: room.name});

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
            if (structure.structureType === STRUCTURE_SPAWN) {
                const spawn = new SpawnManager();
                spawn.initialize(structure);
                this.attachAgent('spawn', spawn);
            }
            else if (structure.structureType === STRUCTURE_CONTROLLER) {
                const controller = new ControllerManager();
                controller.initialize(structure);
                this.attachAgent('controller', controller);
            }
        });

        const buildingManager = new BuildingManager();
        buildingManager.initialize(room);
        this.attachAgent('builders', buildingManager);

        // many BuildingManager will be attached to this agent as deemed
        // necessary by the executed tasks, these don't exist yet at the initialization phase.

        const defenseGroup = new FighterGroup();
        defenseGroup.initialize(room, `DefenseGroup R${room.name}`);
        this.attachAgent('defenseGroup', defenseGroup);

        const logisticManager = new LogisticManager();
        logisticManager.initialize(room);
        this.attachAgent('logistic', logisticManager);
    }

    findGameObject(key, val) {
        if (key === 'room') {
            return Game.rooms[val];
        }
        return Game.getObjectById(val);
    }

    save(state) {
        super.save(state);
        state.unassignedCreepActorIds = this.unassignedCreepActorIds;
        state.nbMiningSpots = this.nbMiningSpots;
        state.containerLocations = this.containerLocations;
        state.extensionLocations = this.extensionLocations;
    }

    run() {
        super.run();
        if (!this.currentObjective) {
            this.setObjective(new InitializeRoom());
        }
    }

    load(state) {
        super.load(state);
        // restore the assigned creep actor from saved id
        this.unassignedCreepActorIds = state.unassignedCreepActorIds;
        this.nbMiningSpots = state.nbMiningSpots;
        this.containerLocations = state.containerLocations;
        this.extensionLocations = state.extensionLocations;
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
            .map(k => this.agent(k))
            .filter(sm => !sm.isDangerous());
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
            this.getSourceManagers().map(s => s.getNbMiningSpots()));
        logger.debug(`Architect (room=${room}) has ${this.nbMiningSpots} mining spots.`);
        return this.nbMiningSpots;
    }

    /**
     * The architect retain the position of the containers it can then pass on
     * to the objectives and tasks scheduled to the managers.
     * There is a container at each non-wall terrain next to a source,
     * as well as a couple of containers next to the source where haulers can deposit
     * The result of this function is cached and will never be recomputed.
     * TODO: split up container locations in mining and controller containers, so
     * we can request mining container location specifically for the energy flow function.
     * for now there is no such controller container ^_^
     */
    getContainerLocations() {
        if (this.containerLocations) { return this.containerLocations; }

        this.containerLocations = [];

        this.getSourceManagers().forEach(s => {
            s.findMiningSpots().forEach(pos => {
                this.containerLocations.push(pos);
            });
        });

        const room = this.object('room');
        const controllerPos = this.agent('controller').object('controller').pos;
        const adjacentOpen = room.lookAtArea(
            controllerPos.y - 1, controllerPos.x - 1,
            controllerPos.y + 1, controllerPos.y - 1, true).filter(lookObj => {
            return (lookObj.type === LOOK_TERRAIN &&
                    lookObj[lookObj.type] !== 'wall');
        });
        let k = 0;
        for (let i = 0; i < adjacentOpen.length; i++) {
            this.containerLocations.push({
                x: adjacentOpen[i].x,
                y: adjacentOpen[i].y
            });
            k++;
            if (k > 2) { break; }
        }

        return this.containerLocations;
    }

    getExtensionsLocations() {
        const room = this.object('room');
        const spawn = this.agent('spawn').object('spawn');
        const nbAllowedExtensions = CONTROLLER_STRUCTURES['extension'][room.controller.level];
        if (!this.extensionLocations || this.extensionLocations.length < nbAllowedExtensions) {
            this.extensionLocations = layoutsUtils.spirale(spawn.pos, nbAllowedExtensions, ({x, y}) => {
                const dx = Math.abs(spawn.pos.x - x);
                const dy = Math.abs(spawn.pos.y - y);
                return dy >= 2 && dx >= 2  // not too close to the spawn
                    // leave space for diagonal movements
                    && ((dy % 2 === 0 && dx % 2 === 0) || (dy % 2 === 1 && dx % 2 === 1))
                    // not structure, resource, or wall terrain
                    // accept construction sites, as these need to be part of the count
                    // as they do account for the maximum nb of allowed extensions
                    && room.lookForAt(LOOK_STRUCTURES, x, y).length === 0
                    && room.lookForAt(LOOK_RESOURCES, x, y).length === 0
                    && room.lookForAt(LOOK_TERRAIN).filter(terrain => terrain.type === 'wall').length === 0;
            });
            this.extensionLocations.forEach(({x, y}) => {
                console.log(`Will build extension at: ${x}, ${y}`);
            });
        }
        else {
            this.extensionLocations.forEach(({x, y}) => {
                console.log(`Pre-saved build extension at: ${x}, ${y}`);
            });
        }

        return this.extensionLocations;
    }

    getRCL() {
        const room = this.object('room');
        return room.controller.level;
    }
}

module.exports = Architect;