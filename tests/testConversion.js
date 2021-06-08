const BayesianCalculator = require('../src/conversioncalculator');
const utils = require('../src/utils');
const metricTypeEnum = require('../src/metricTypeEnum');

const cr = 0.2; // control conversion rate
const improvement = 0.5; // minimum relative improvement
const nVars = 2; // number of variations
const reqCTBA = 0.95; // required probability to be the best
const reqTOC = cr * improvement * 0.075; // threshold of caring for potential loss
const delta = cr * improvement; // minimum improvement

const calc = new BayesianCalculator(cr, improvement, nVars);
const metricSearch = new utils.BinarySearchMetric(cr * improvement, 10);

console.log('Estimating CTBA');

let estimatedError = metricSearch.ctba(0, 1, reqCTBA, 0.000001);
console.log('Estimated Std Error', estimatedError);
console.log('Estimated CTBA using Estimated Std Error', utils.getCTBA(delta, estimatedError));

let visitors = calc.getEstimatedVisitors(estimatedError);
console.log('Estimated Visitors', visitors);

let estimates = calc.getSimulatedDurationDist(visitors, 1000, reqCTBA, metricTypeEnum.CTBA);
console.log('Percentile Estimates', utils.getQuantiles(estimates, [0.1, 0.5, 0.99])); // to get extremes

console.log('Estimating Potential Loss');

estimatedError = metricSearch.potentialLoss(0, 10, reqTOC, 0.000001);
console.log('Estimated Std Error', estimatedError);
console.log('Estimated PL using Estimated Std Error', utils.getPL(-1 * delta, estimatedError, 0, 1));

visitors = calc.getEstimatedVisitors(estimatedError);
console.log('Estimated Visitors', visitors);

estimates = calc.getSimulatedDurationDist(visitors, 1000, reqTOC, metricTypeEnum.POTENTIAL_LOSS);
console.log('Percentile Estimates', utils.getQuantiles(estimates, [0.1, 0.5, 0.99])); // to get extremes
