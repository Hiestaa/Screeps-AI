const {
    O_EXPAND_POPULATION,
    O_DISTRIBUTE_ENERGY,
    O_STAY_FILLED_UP,
    O_INITIALIZE_ROOM,
    O_CLEAR_ROOM_THREATS,
    O_GARRISONS
} = require('constants');

module.exports = {
    [O_EXPAND_POPULATION]: require('objectives.actor.ExpandPopulation'),
    [O_STAY_FILLED_UP]: require('objectives.manager.StayFilledUp'),
    [O_INITIALIZE_ROOM]: require('objectives.architect.InitializeRoom'),
    [O_DISTRIBUTE_ENERGY]: require('objectives.manager.DistributeEnergy'),
    [O_CLEAR_ROOM_THREATS]: require('objectives.manager.ClearRoomThreat'),
    [O_GARRISONS]: require('objectives.manager.Garrisons')
};
