const dist = require('./distribution');

/**
 * fetch quantile from an array
 * @param  {number[]} array
 * @param  {number} quantile
 * @returns {number} - quantile value
 */
function _quantile(array, quantile) {
  if (array.length === 0) return 0;

  const index = quantile * (array.length - 1);
  let result;
  if (Math.floor(index) === index) {
    result = array[index];
  } else {
    const i = Math.floor(index);
    const fraction = index - i;
    result = array[i] + (array[i + 1] - array[i]) * fraction;
  }
  return result;
}

/**
 * fetch quantiles from an array
 * @param  {number[]} arr - array
 * @param  {number[]} quantiles - quantile array
 * @returns {number[]} quantile values
 */
function getQuantiles(arr, quantiles) {
  arr.sort(function (a, b) {
    return a - b;
  });
  const values = [];
  for (const p in quantiles) {
    values.push(_quantile(arr, quantiles[p]));
  }
  return values;
}

/**
 * obtain chance to beat all analytically
 * @param  {number} mean
 * @param  {number} std - standard deviation
 * @returns {number} ctba
 */
function getCTBA(mean, std) {
  const normDist = new dist.NormalDistribution(mean, std);

  return 1 - normDist.cdf(0);
}

/**
 * obtain potential loss analytically
 * @param  {number} mean
 * @param  {number} std - standard deviation
 * @returns {number} potential loss
 */
function getPL(mean, std, lo, hi) {
  lo = (lo - mean) / std;
  hi = (hi - mean) / std;
  const truncNorm = new dist.TruncNormalDistribution(mean, std, lo, hi);
  const normDist = new dist.NormalDistribution(mean, std);

  return truncNorm.mean() * (1 - normDist.cdf(0));
}

/**
 * check if thresholds are reached
 * @param  {number} param - required value
 * @param  {number} computedParam - computed value
 * @param  {number} errorBound - error tolerance
 * @returns {[boolean, boolean]} - within bounds and is error positive
 */
function checkWithinErrorBound(param, computedParam, errorBound) {
  const err = (computedParam - param) / param;
  const isPositive = err > 0;
  const withinBound = Math.abs(err) < errorBound;

  return [withinBound, isPositive];
}

class BinarySearchMetric {
  /**
   * @param  {number} delta - absolute uplift
   * @param  {number} upperBound - upperlimit of truncated distribution
   */
  constructor(delta, upperBound) {
    this.delta = delta;
    this.upperBound = upperBound;
  }

  /**
   * binary search value of standard error in chance to beat all
   * @param  {number} lo - lower limit
   * @param  {number} hi - upper limit
   * @param  {number} reqCTBA - required ctba of interest
   * @param  {number} err - error tolerance
   * @returns {number} standard error
   */
  ctba(lo, hi, reqCTBA, err) {
    if (hi >= lo) {
      const mid = (hi + lo) / 2;
      const [withinError, isPositive] = checkWithinErrorBound(reqCTBA, getCTBA(this.delta, mid), err);

      if (withinError) {
        return mid;
      } else if (isPositive) {
        return this.ctba(mid, hi, reqCTBA, err);
      } else {
        return this.ctba(lo, mid, reqCTBA, err);
      }
    } else {
      return -1;
    }
  }

  /**
   * binary search value of standard error in potential loss
   * @param  {number} lo - lower limit
   * @param  {number} hi - upper limit
   * @param  {number} reqPL - required potential loss of interest
   * @param  {number} err - error tolerance
   * @returns {number} standard error
   */
  potentialLoss(lo, hi, reqPL, err) {
    // lo,hi = range within which stds to be tried out
    // reqCTBA = Potential Loss of interest i.e. TOC
    // error = Tolerance
    if (hi >= lo) {
      const mid = (hi + lo) / 2;
      const [withinError, isPositive] = checkWithinErrorBound(
        reqPL,
        getPL(-1 * this.delta, mid, 0, this.upperBound),
        err
      );

      if (withinError) {
        return mid;
      } else if (isPositive) {
        return this.potentialLoss(lo, mid, reqPL, err);
      } else {
        return this.potentialLoss(mid, hi, reqPL, err);
      }
    } else {
      return -1;
    }
  }
}

module.exports.getQuantiles = getQuantiles;
module.exports.BinarySearchMetric = BinarySearchMetric;
module.exports.getCTBA = getCTBA;
module.exports.getPL = getPL;
