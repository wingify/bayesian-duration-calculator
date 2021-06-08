const dist = require('./distribution');
const utils = require('../src/utils');
const metricTypeEnum = require('../src/metricTypeEnum');

class BayesianCalculator {
  /**
   * @param  {number} cr - conversion rate
   * @param  {number} improvement - minimum improvement
   * @param  {number} nVars - number of variations
   */
  constructor(cr, improvement, nVars) {
    this.cr = cr;
    this.delta = cr * improvement;
    this.nVars = nVars;
  }

  /**
   * get standard error
   * @param  {number} cr1 - conversion rate of control
   * @param  {number} improvement - minimum improvement
   * @param  {number} nVisitors - number of visitors in a test
   * @returns {number} get standard error
   */
  getSTD(cr1, improvement, nVisitors) {
    const var1 = cr1 * (1 - cr1);
    const cr2 = cr1 * (1 + improvement);
    const var2 = cr2 * (1 - cr2);
    const sigma = Math.sqrt(var1 + var2);

    return sigma / Math.sqrt(nVisitors);
  }

  /**
   * obtain number of visitors using standard error
   * @param  {number} stdError - standard error
   * @returns {number} estimated number of visitors in a test
   */
  getEstimatedVisitors(stdError) {
    const var1 = this.cr * (1 - this.cr);
    const cr2 = this.cr + this.delta;
    const var2 = cr2 * (1 - cr2);
    const sigma = Math.sqrt(var1 + var2);

    return this.nVars * (sigma / stdError) ** 2;
  }

  /**
   * perform a simulation to obtain estimated number of visitors in uncertainity
   * @param  {number} hits - number of visitors
   * @param  {number} reqMetric - metric value required
   * @param  {string} metricName - ctba or potential loss
   * @returns {number[]} estimated visitor
   */
  getSimulatedDuration(hits, reqMetric, metricName) {
    const crs = [this.cr, this.cr + this.delta];
    const trials = Math.ceil(hits / this.nVars);
    const convs = [
      new dist.BinomialDistribution(trials, crs[0]).sample(),
      new dist.BinomialDistribution(trials, crs[1]).sample(),
    ];
    let newCRs = [convs[0] / trials, convs[1] / trials];

    newCRs = [Math.min(...newCRs), Math.max(...newCRs)];
    const newImprovement = (newCRs[1] - newCRs[0]) / newCRs[0];

    try {
      if (newImprovement > 0.000001) {
        // no computation for improvement below this
        const calc = new BayesianCalculator(newCRs[0], newImprovement, this.nVars);
        let estimatedError;
        const metricSearch = new utils.BinarySearchMetric(newCRs[0] * newImprovement, 10);

        if (metricName === metricTypeEnum.CTBA) {
          estimatedError = metricSearch.ctba(0, 1, reqMetric, 0.000001);
        } else if (metricName === metricTypeEnum.POTENTIAL_LOSS) {
          estimatedError = metricSearch.potentialLoss(0, 10, reqMetric, 0.000001);
        }
        return calc.getEstimatedVisitors(estimatedError);
      } else {
        return -1;
      }
    } catch (_err) {
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

module.exports = BayesianCalculator;
