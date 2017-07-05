"use strict";

// var exports = module.exports = {};

exports.mergeIntervals = function (intervals1, intervals2) {
    if (intervals1.length == 0) {
        return intervals2;
    } 

    if (intervals2.length == 0) {
        return intervals1;
    }

    if (intervals1[0][0] > intervals2[0][0]) {
        let temp = intervals1;
        intervals1 = intervals2; 
        intervals2 = temp;
    }

    let newIntervals = [];
    newIntervals.push(intervals1[0]);
    
    let i = 1,
        j = 0;

    while (i < intervals1.length && j < intervals2.length) {
        let lastInterval = newIntervals[newIntervals.length - 1],
            i1 = intervals1[i],
            i2 = intervals2[j];

        if (i1[0] < i2[0]) {
            if (i1[0] <= lastInterval[1]) {
                lastInterval[1] = Math.max(lastInterval[1], i1[1]);
            } else {
                newIntervals.push(i1);
            }

            i++;
        } else {
            if (i2[0] <= lastInterval[1]) {
                lastInterval[1] = Math.max(lastInterval[1], i2[1]);
            } else {
                newIntervals.push(i2);
            }

            j++;
        }
    }

    let lastInterval = newIntervals[newIntervals.length - 1];
    while (i < intervals1.length) {
        let i1 = intervals1[i];
        if (lastInterval[1] < i1[0]) {
            while (i < intervals1.length) {
                newIntervals.push(intervals1[i]);
                i++;
            }

            break;
        } else {
            lastInterval[1] = Math.max(lastInterval[1], i1[1]);
            i++;
        }
    }

    while (j < intervals2.length) {
        let i2 = intervals2[j];
        if (lastInterval[1] < i2[0]) {
            while (j < intervals2.length) {
                newIntervals.push(intervals2[j]);
                j++;
            }

            break;
        } else {
            lastInterval[1] = Math.max(lastInterval[1], i2[1]);
            j++;
        }
    }

    return newIntervals;
}


exports.squishIntervals = function (intervals) {
    let squishedIntervals = [];
    for (let i = 0; i < intervals.length; i++) {
        let curInterval = [];
        curInterval[0] = intervals[i][0];
        while (i + 1 < intervals.length && intervals[i][1] >= intervals[i + 1][0]) {
            i++;
        }
        curInterval[1] = intervals[i][1];
        squishedIntervals.push(curInterval);
    }

    return squishedIntervals;
}


exports.intersectSpan = function (intervals1, intervals2) {
    let intersectSpan = 0,
    i = 0, 
    j = 0; 

    while (i < intervals1.length && j < intervals2.length) {
        let i1 = intervals1[i],
            i2 = intervals2[j];

        if (i1[0] < i2[0]) {
            if (i2[0] < i1[1]) {
                if (i2[1] <= i1[1]) {
                    intersectSpan += i2[1] - i2[0];
                    j++;
                } else {
                    intersectSpan += i1[1] - i2[0];
                    i++;
                }
            } else {
                i++;
            }
        } else {
            if (i1[0] < i2[1]) {
                if (i1[1] <= i2[1]) {
                    intersectSpan += i1[1] - i1[0];
                    i++;
                } else {
                    intersectSpan += i2[1] - i1[0];
                    j++;
                }
            } else {
                j++;
            }
        }
    }

    return intersectSpan;
}

// module.exports = {
//     mergeIntervals: mergeIntervals,
//     squishIntervals: squishIntervals,
//     intersectSpan: intersectSpan
// };