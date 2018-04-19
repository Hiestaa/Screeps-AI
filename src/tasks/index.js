const {
    T_SPAWN,
    T_POPULATE_INITIAL_GROUPS,
    T_INITIALIZE_COLONY,
    A_HARVEST,
    A_HAUL,
    A_UPGRADE,
    T_GET_FACTION_STARTED,
    T_BE_HARVESTED,
    T_FILLUP
} = require('constants');

module.exports = {
    [T_SPAWN]: require('tasks.actor.Spawn'),
    [T_POPULATE_INITIAL_GROUPS]: require('tasks.architect.PopulateInitialGroups'),
    [T_INITIALIZE_COLONY]: require('tasks.colony.InitializeColony'),
    [A_HARVEST]: require('tasks.creepActions.Harvest'),
    [A_HAUL]: require('tasks.creepActions.Haul'),
    [A_UPGRADE]: require('tasks.creepActions.Upgrade'),
    [T_GET_FACTION_STARTED]: require('tasks.hiveMind.GetFactionStarted'),
    [T_BE_HARVESTED]: require('tasks.manager.BeHarvested'),
    [T_FILLUP]: require('tasks.manager.FillUp')
};
