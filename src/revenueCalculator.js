const dist = require('./distribution');
const utils = require('../src/utils');
const metricTypeEnum = require('../src/metricTypeEnum');

class BayesianRevenueCalculator {
  /**
   * @param  {number} cr - conversion rate
   * @param  {number} rps - revenue per conversion
   * @param  {number} improvement - minimum improvement
   * @param  {number} nVars - number of variations
   */
  constructor(cr, rps, improvement, nVars) {
    this.cr1 = cr;
    this.cr2 = cr;
    this.rps1 = rps;
    this.rps2 = rps * (1 + improvement);
    this.delta = this.cr2 * this.rps2 - this.cr1 * this.rps1;
    this.nVars = nVars;
  }

  /**
   * get variance of data distribution. Assumes revenue per sale is exponentially distributed
   * @param  {number} cr - conversion rate
   * @param  {number} rps - revenue per conversion
   * @returns  {number} data variance
   */
  getDataVariance(cr, rps) {
    return cr * rps ** 2 + cr * (1 - cr) * rps ** 2;
  }

  /**
   * get mean of revenue per visitor distribution
   * @param  {number} cr - conversion rate
   * @param  {number} rps - revenue per conversion
   * @returns {number} mean
   */
  getDataMean(cr, rps) {
    return cr * rps;
  }

  /**
   * get standard error
   * @param  {number} cr1 - conversion rate of control
   * @param  {number} rps1 - revenue per conversion of control
   * @param  {number} cr2 - conversion rate of variation
   * @param  {number} rps2 - revenue per conversion of variation
   * @param  {number} nVisitors - number of visitors in a test
   * @returns {number} get standard error
   */
  getSTD(cr1, rps1, cr2, rps2, nVisitors) {
    const var1 = this.getDataVariance(cr1, rps1);
    const var2 = this.getDataVariance(cr2, rps2);
    const sigma = Math.sqrt(var1 + var2);

    return sigma / Math.sqrt(nVisitors);
  }

  /**
   * obtain number of visitors using standard error
   * @param  {number} stdError - standard error
   * @returns {number} estimated number of visitors in a test
   */
  getEstimatedVisitors(stdError) {
    const var1 = this.getDataVariance(this.cr1, this.rps1);
    const var2 = this.getDataVariance(this.cr2, this.rps2);
    const sigma = Math.sqrt(var1 + var2);

    return this.nVars * (sigma / stdError) ** 2;
  }

  /**
   * perform a simulation to obtain estimated number of visitors in uncertainity
   * @param  {number} hits - number of visitors
   * @param  {number} reqMetric - metric value required
   * @param  {string} metricName - ctba or potential loss
   * @returns {number} estimated visitor
   */
  getSimulatedDuration(hits, reqMetric, metricName) {
    const trials = Math.ceil(hits / this.nVars);
    const convs = [
      new dist.BinomialDistribution(trials, this.cr1).sample(),
      new dist.BinomialDistribution(trials, this.cr2).sample(),
    ];
    let newCRs = [convs[0] / trials, convs[1] / trials];
    let newRPSs = [
      new dist.ExponentialDistribution(this.rps1).samplesAvg(convs[0]),
      new dist.ExponentialDistribution(this.rps2).samplesAvg(convs[1]),
    ];
    let newRPVs = [newCRs[0] * newRPSs[0], newCRs[1] * newRPSs[1]];
    const indexes = [newRPVs.indexOf(Math.min(...newRPVs)), newRPVs.indexOf(Math.max(...newRPVs))];

    newCRs = [newCRs[indexes[0]], newCRs[indexes[1]]];
    newRPVs = [newRPVs[indexes[0]], newRPVs[indexes[1]]];
    newRPSs = [newRPVs[0] / newCRs[0], newRPVs[1] / newCRs[0]];

    const newImprovement = (newRPVs[1] - newRPVs[0]) / newRPVs[0];

    try {
      if (newImprovement > 0.000001) {
        // no computation for improvement below this
        // No calculation below this uplift threshold
        const calc = new BayesianRevenueCalculator(newCRs[0], newRPSs[0], newImprovement, this.nVars);
        let estimatedError;
        const metricSearch = new utils.BinarySearchMetric(newCRs[0] * newRPSs[0] * newImprovement, this.rps2 * 100);

        if (metricName === metricTypeEnum.CTBA) {
          estimatedError = metricSearch.ctba(0, this.rps2 * 100, reqMetric, 0.000001);
        } else if (metricName === metricTypeEnum.POTENTIAL_LOSS) {
          estimatedError = metricSearch.potentialLoss(0, this.rps2 * 100, reqMetric, 0.000001);
        }
        return calc.getEstimatedVisitors(estimatedError);
      } else {
        return -1;
      }
    } catch {
      return -1;
    }
  }

  /**
   * obtain a distribution of estimated number of visitors in uncertainity by simulations
   * @param  {number} hits - number of visitors
   * @param  {number} nSims - number of simulations to run
   * @param  {number} reqMetric - metric value required
   * @param  {string} metricName - ctba or potential loss
   * @returns {number[]} possible estimated visitors
   */
  getSimulatedDurationDist(hits, nSims, reqMetric, metricName = metricTypeEnum.CTBA) {
    const estimations = [];

    for (let i = 0; i < nSims; i++) {
      estimations.push(this.getSimulatedDuration(hits, reqMetric, metricName));
    }

    return estimations.filter((a) => {
      return a !== -1;
    });
  }
}

module.exports = BayesianRevenueCalculator;
