const {
    O_EXPAND_POPULATION,
    O_DISTRIBUTE_ENERGY,
    O_STAY_FILLED_UP,
    O_INITIALIZE_ROOM
} = require('constants');

module.exports = {
    [O_EXPAND_POPULATION]: require('objectives.actor.ExpandPopulation'),
    [O_STAY_FILLED_UP]: require('objectives.actor.StayFilledUp'),
    [O_INITIALIZE_ROOM]: require('objectives.architect.InitializeRoom'),
    [O_DISTRIBUTE_ENERGY]: require('objectives.manager.DistributeEnergy')
};
