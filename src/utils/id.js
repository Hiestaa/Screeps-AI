Memory.globalCount = Memory.globalCount || 0;

module.exports = () => {
    Memory.globalCount += 1;
    return Memory.globalCount;
};
