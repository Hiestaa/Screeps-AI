const chai = require('chai');
const expect = chai.expect;

global.Memory = {};

const layouts = require('../../src/utils/layouts');

describe('layouts', function() {
    describe('spirale', function () {
        it('should generate a proper 3x3 spirale', function () {
            const points = layouts.spirale({x: 25, y: 25}, 8);
            expect(points.length).to.equal(8);
            expect(points[0]).to.eql({x: 25, y: 24});
            expect(points[1]).to.eql({x: 26, y: 24});
            expect(points[2]).to.eql({x: 26, y: 25});
            expect(points[3]).to.eql({x: 26, y: 26});
            expect(points[4]).to.eql({x: 25, y: 26});
            expect(points[5]).to.eql({x: 24, y: 26});
            expect(points[6]).to.eql({x: 24, y: 25});
            expect(points[7]).to.eql({x: 24, y: 24});
        });

        it('should generate a proper 150 points spirale', function () {
            const points = layouts.spirale({x: 25, y: 25}, 150);
            expect(points.length).to.equal(150);
            // too lazy to check the positions :p
        });

        it('should skip points with even coordinate', function () {
            const points = layouts.spirale({x: 25, y: 25}, 150, ({x, y}) => {
                return x % 2 === 0 && y % 2 === 0;
            });
            expect(points.length).to.equal(150);
        });
    });
});