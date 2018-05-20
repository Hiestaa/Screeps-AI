const BaseObjective = require('objectives.BaseObjective');
const {
    O_POPULATION_CONTROL,
    O_EXPAND_POPULATION,
    AT_COLONY,
    O_UPGRADE_RCL_2,
    CP_WORKER,
    CP_HARVESTER,
    CP_HAULER
} = require('constants');
const ExpandPopulation = require('objectives.actor.ExpandPopulation');
const logger = require('log').getLogger('tasks.colony.PopulationControl', 'white');

/**
 * The PopulationControl objective consists in increasing the creeps cap
 * set to the colony that executes the objective as needed by the architects of
 * the colony.
 * It follows a set of predefined rules to determine when to expand the population
 * of the colony (a state machine).
 * If the colony has only one room and never spawned any creep, it spawns the few
 * creeps that will get the room started.
 * If the colony has only one room that finished initial building, expand population
 * to include dedicated tasks.
 * If the colony's first room has reached RCL2,  ...
 * A better approach may be to utilize a request approach to react on events happening
 * in the colony without having to check the occurrence of the event at each tick
 */
class PopulationControl extends BaseObjective {
    constructor(memory={}) {
        super(O_POPULATION_CONTROL, AT_COLONY, memory, {
            frequency: 10
        });
        // TODO: make this state machine generic, so that all objectives can define
        // and execute a state machine without having to reimplement the logic
        // Define which function to execute to transition to the next state from a given state
        this.transitions = {
            // haven't spawned any creep yet, and the colony only has one room
            ONE_ROOM_DEFINE_INITIAL_WORKERS: this.oneRoomDefineInitialWorkers.bind(this),
            // still one room and we've only spawned the basic workers, no
            // role has been defined yeyt
            ONE_ROOM_DEFINE_RCL1_ROLES: this.oneRoomDefineRcl1Roles.bind(this),
            // we went above RCL1 and started building extensions, we now need haulers
            // to refill these extensions, as well as the containers nearby the controller.
            ONE_ROOM_NEED_MORE_HAULERS_1: this.oneRoomNeedMoreHaulers.bind(this),
            ONE_ROOM_NEED_MORE_HAULERS_2: this.oneRoomNeedMoreHaulers.bind(this),
            ONE_ROOM_NEED_MORE_HAULERS_3: this.oneRoomNeedMoreHaulers.bind(this),
            ONE_ROOM_NEED_MORE_HAULERS_4: this.oneRoomNeedMoreHaulers.bind(this),
            ONE_ROOM_NEED_MORE_HAULERS_5: this.oneRoomNeedMoreHaulers.bind(this),
            ONE_ROOM_NEED_MORE_HAULERS_6: this.oneRoomNeedMoreHaulers.bind(this),
            ONE_ROOM_NEED_MORE_HAULERS_7: this.oneRoomNeedMoreHaulers.bind(this),
            // still one room and we've spawned the roles relevant for RCL1,
            // the next population expansion will happen
            FIRST_REMOTE_MINING_ROOM: this.firstRemoteMiningRoom.bind(this)
        };

        // Define conditions necessary for a given state function to be executed
        this.conditions = {
            // no need to verify there is only one room here -
            // we're never going to be able to respawn with multiple rooms
            // there is no condition to execute the ONE_ROOM_DEFINE_INITIAL_WORKERS
            // transition function
            ONE_ROOM_DEFINE_INITIAL_WORKERS: () => true,
            // transition to the ONE_ROOM_DEFINE_RCL1_ROLES state when the spawn
            // room architect's objectives becomes to upgrade rcl to level 2.
            ONE_ROOM_DEFINE_RCL1_ROLES: (colony) => {
                return colony.agent('spawnRoomArchitect').hasObjective(O_UPGRADE_RCL_2)
                    || colony.agent('spawnRoomArchitect').getRCL() >= 2;
            },
            // transition from the ONE_ROOM_NEED_MORE_HAULERS[_X] state when
            // the room architect's RCL reaches 2 (or above)
            ONE_ROOM_NEED_MORE_HAULERS_1: (colony) => {
                return colony.agent('spawnRoomArchitect').getRCL() >= 2;
            },
            ONE_ROOM_NEED_MORE_HAULERS_2: (colony) => {
                return colony.agent('spawnRoomArchitect').getRCL() >= 3;
            },
            ONE_ROOM_NEED_MORE_HAULERS_3: (colony) => {
                return colony.agent('spawnRoomArchitect').getRCL() >= 4;
            },
            ONE_ROOM_NEED_MORE_HAULERS_4: (colony) => {
                return colony.agent('spawnRoomArchitect').getRCL() >= 5;
            },
            ONE_ROOM_NEED_MORE_HAULERS_5: (colony) => {
                return colony.agent('spawnRoomArchitect').getRCL() >= 6;
            },
            ONE_ROOM_NEED_MORE_HAULERS_6: (colony) => {
                return colony.agent('spawnRoomArchitect').getRCL() >= 7;
            },
            ONE_ROOM_NEED_MORE_HAULERS_7: (colony) => {
                return colony.agent('spawnRoomArchitect').getRCL() >= 8;
            },
            // transition from the FIRST_REMOTE_MINING_ROOM when the colony has
            // its first remote mining room attached.
            FIRST_REMOTE_MINING_ROOM: (colony) => {
                return !!colony.agent('firstRemoteMiningRoom');
            }
        };

        if (!this.state.currentState) {
            this.state.currentState = 'ONE_ROOM_DEFINE_INITIAL_WORKERS';
        }
    }

    // when we only have one room and no creep, we want to expand the population
    // to a minimum number of 1 worker per source
    oneRoomDefineInitialWorkers(colony) {
        logger.info('Defining objective for initial workers');
        const architect = colony.agent('spawnRoomArchitect');

        const nbSources = architect.getSourceManagers().length;
        let profiles = {
            [CP_WORKER]: nbSources
        };

        colony.agent('spawnActor').setObjective(new ExpandPopulation({
            params: {profiles, handlerId: architect.id}}));

        this.state.currentState = 'ONE_ROOM_DEFINE_RCL1_ROLES';
    }

    oneRoomDefineRcl1Roles(colony) {
        logger.info('Defining objective for RCL1 roles');
        const architect = colony.agent('spawnRoomArchitect');

        const nbSources = architect.getSourceManagers().length;
        const nbUpgradeSpots = architect.agent('controller').getNbUpgradeSpots();

        let profiles = {
            [CP_HARVESTER]: nbSources,
            [CP_HAULER]: 1,
            [CP_WORKER]: Math.round(nbUpgradeSpots * 0.75)
        };

        colony.agent('spawnActor').setObjective(new ExpandPopulation({
            params: {profiles, handlerId: architect.id}
        }));

        this.state.currentState = 'ONE_ROOM_NEED_MORE_HAULERS_1';
    }

    oneRoomNeedMoreHaulers(colony) {
        logger.info('Defining objective for logistic network.');
        const architect = colony.agent('spawnRoomArchitect');
        const level = architect.getRCL();
        const nbExtensions = CONTROLLER_STRUCTURES.extension[level];
        const nbContainers = CONTROLLER_STRUCTURES.container[level];

        const currentObjective = colony.agent('spawnActor').currentObjective;
        const profiles = currentObjective.type === O_EXPAND_POPULATION && !currentObjective.params.profiles.length
            ? currentObjective.params.profiles
            : {};

        profiles[CP_HAULER] = Math.round((nbExtensions + nbContainers) / 5);

        colony.agent('spawnActor').setObjective(new ExpandPopulation({
            params: {profiles, handlerId: architect.id}
        }));

        const stepN = parseInt(this.state.currentState.split('_').slice(-1)[0]);
        if (stepN >= 7) {
            // TODO, this should be recursive in some way, e.g. this objective
            // should be parametized to a specific architect of the colony, so
            // we can just reiterate over all states for the remote mining room
            // exactly the same way it would happen in the starting room.
            this.state.currentState = 'FIRST_REMOTE_MINING_ROOM';
        }
        else {
            this.state.currentState = 'ONE_ROOM_NEED_MORE_HAULERS_' + (stepN + 1);
        }
    }

    firstRemoteMiningRoom() {

    }

    execute(colony) {
        if (this.state.currentState &&
            this.conditions[this.state.currentState] &&
            this.transitions[this.state.currentState] &&
            this.conditions[this.state.currentState](colony)) {
            this.transitions[this.state.currentState](colony);
        }
        else {
            if (this.state.currentState && !this.conditions[this.state.currentState]) {
                logger.warning('No condition for current state: ' + this.state.currentState);
            }
            if (this.state.currentState && !this.transitions[this.state.currentState]) {
                logger.warning('No transition for current state: ' + this.state.currentState);
            }
        }
    }
}

module.exports = PopulationControl;
