const BayesianRevenueCalculator = require('../src/revenueCalculator');
const utils = require('../src/utils');
const metricTypeEnum = require('../src/metricTypeEnum');

const cr = 0.1; // control conversion rate
const rps = 10000000; // control revenue per conversion
const improvement = 0.1; // relative improvement in revenue per visitor
const nVars = 2; // number of variations
const reqCTBA = 0.99; // required probability to be the best
const delta = cr * rps * (1 + improvement) - cr * rps; // minimum uplift
const reqTOC = delta * 0.075; // threshold of caring for potential loss

const calc = new BayesianRevenueCalculator(cr, rps, improvement, nVars);
const metricSearch = new utils.BinarySearchMetric(cr * rps * improvement, rps * 100);

console.log('Estimating CTBA');

let estimatedError = metricSearch.ctba(0, rps * 100, reqCTBA, 0.000001);
console.log('Estimated Std Error', estimatedError);
console.log('Estimated CTBA using Estimated Std Error', utils.getCTBA(delta, estimatedError));

let visitors = calc.getEstimatedVisitors(estimatedError);
console.log('Estimated Visitors', visitors);

let estimates = calc.getSimulatedDurationDist(visitors, 1000, reqCTBA, metricTypeEnum.CTBA);
console.log('Percentile Estimates', utils.getQuantiles(estimates, [0.1, 0.5, 0.9]));

console.log('Estimating Potential Loss');

estimatedError = metricSearch.potentialLoss(0, rps * 100, reqTOC, 0.000001);
console.log('Estimated Std Error', estimatedError);
console.log('Estimated PL using Estimated Std Error', utils.getPL(-1 * delta, estimatedError, 0, rps * 100));

visitors = calc.getEstimatedVisitors(estimatedError);
console.log('Estimated Visitors', visitors);

estimates = calc.getSimulatedDurationDist(visitors, 1000, reqTOC, metricTypeEnum.POTENTIAL_LOSS);
console.log('Percentile Estimates', utils.getQuantiles(estimates, [0.1, 0.5, 0.9]));
