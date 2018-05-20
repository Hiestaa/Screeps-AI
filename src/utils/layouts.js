const addPointIfValid = (collection, point, isValidPosition) => {
    if (point.x >= 0 && point.x < 50 &&
        point.y >= 0 && point.y < 50 &&
        isValidPosition(point)) {
        collection.push(Object.assign({}, point));
    }
};

const _spirale = (start, width, points, maxNbPoints, isValidPosition) => {
    let pointer = {x: start.x, y: start.y};
    // 1 up
    pointer.y -= 1;
    addPointIfValid(points, pointer, isValidPosition);
    if (points.length >= maxNbPoints) { return points; }

    // `width - 2` right
    for (let i = 0; i < width - 2; i++) {
        pointer.x += 1;
        addPointIfValid(points, pointer, isValidPosition);
        if (points.length >= maxNbPoints) { return points; }
    }

    // `width - 1` down
    for (let i = 0; i < width - 1; i++) {
        pointer.y += 1;
        addPointIfValid(points, pointer, isValidPosition);
        if (points.length >= maxNbPoints) { return points; }
    }

    // `width - 1` left
    for (let i = 0; i < width - 1; i++) {
        pointer.x -= 1;
        addPointIfValid(points, pointer, isValidPosition);
        if (points.length >= maxNbPoints) { return points; }
    }

    // `width - 1` up
    for (let i = 0; i < width - 1; i++) {
        pointer.y -= 1;
        addPointIfValid(points, pointer, isValidPosition);
        if (points.length >= maxNbPoints) { return points; }
    }

    return _spirale(pointer, width + 2, points, maxNbPoints, isValidPosition);
};

/**
 * Generates a spirale
 * @param {Object} center - {x, y} position of the center of the spirale
 *                 will not be included in the returned values
 * @param {Integer} nbPoints - number of points to generate
 * @param {Function} [isValidPosition=(({x, y}) => true)] - filter out valid position
 * @return {Array<Object>} list of returned {x, y} position objects
 */
exports.spirale = (center, nbPoints, isValidPosition) => {
    return _spirale(center, 3, [], nbPoints, (isValidPosition || (() => true)));
};
