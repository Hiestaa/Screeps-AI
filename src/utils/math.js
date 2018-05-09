
const extr = function (collection, getVal, compare) {
    getVal = getVal || ((item) => item);

    let minItem = null;
    let minVal = null;
    let minIdx = null;

    for (var i = 0; i < collection.length; i++) {
        if (minItem === null) {
            minItem = collection[i];
            minVal = getVal(collection[i]);
            minIdx = i;
            continue;
        }
        const dist = getVal(collection[i]);
        if (compare(dist, minVal)) {
            minItem = collection[i];
            minVal = dist;
            minIdx = i;
        }
    }

    return {
        idx: minIdx,
        val: minVal,
        item: minItem
    };
};

/**
 * Get the minimum value of a collection, where the value associated with
 * each item of the collection is given by `getVal`.
 * @param {Array} collection - collection of items
 * @param {Function} [getVal=(item) => item] - get the value associated with an item
 * @return {Object} - a {item, val, idx} object
 */
module.exports.min = function (collection, getVal) {
    return extr(collection, getVal, (a, b) => a < b);
};

/**
 * Get the maximum value of a collection, where the value associated with
 * each item of the collection is given by `getVal`.
 * @param {Array} collection - collection of items
 * @param {Function} [getVal=(item) => item] - get the value associated with an item
 * @return {Object} - a {item, val, idx} object
 */
module.exports.max = function (collection, getVal) {
    return extr(collection, getVal, (a, b) => a > b);
};
