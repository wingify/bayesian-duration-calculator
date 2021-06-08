/** Class representing a Normal Distribution.
 * The class NormalDistribution has references from "jstat project, version 1.9.4", Copyright since 2013, jStat under MIT License.
 */
class NormalDistribution {
  /**
   * Create a Normal Distribution object.
   * @param {number} mean - Mean
   * @param {number} std - Standard deviation
   */
  constructor(mean, std) {
    this.mean = mean;
    this.std = std;
  }

  /**
   * Get the probability of x
   * @returns {number} The probability value.
   */
  pdf(x) {
    return Math.exp(
      -0.5 * Math.log(2 * Math.PI) - Math.log(this.std) - Math.pow(x - this.mean, 2) / (2 * this.std * this.std)
    );
  }

  /**
   * Get the cumulative density at x
   * @returns {number} The cumulative density.
   */
  cdf(x) {
    return 0.5 * (1 + this.erf((x - this.mean) / Math.sqrt(2 * this.std * this.std)));
  }

  /**
   * @returns {number} the error function erf(x)
   */
  erf(x) {
    /* eslint-disable no-loss-of-precision */
    const cof = [
      -1.3026537197817094, 6.4196979235649026e-1, 1.9476473204185836e-2, -9.561514786808631e-3, -9.46595344482036e-4,
      3.66839497852761e-4, 4.2523324806907e-5, -2.0278578112534e-5, -1.624290004647e-6, 1.30365583558e-6,
      1.5626441722e-8, -8.5238095915e-8, 6.529054439e-9, 5.059343495e-9, -9.91364156e-10, -2.27365122e-10,
      9.6467911e-11, 2.394038e-12, -6.886027e-12, 8.94487e-13, 3.13092e-13, -1.12708e-13, 3.81e-16, 7.106e-15,
      -1.523e-15, -9.4e-17, 1.21e-16, -2.8e-17,
    ];
    /* eslint-enable no-loss-of-precision */
    let j = cof.length - 1;
    let isneg = false;
    let d = 0;
    let dd = 0;
    let tmp;

    if (x < 0) {
      x = -x;
      isneg = true;
    }

    const t = 2 / (2 + x);
    const ty = 4 * t - 2;

    for (; j > 0; j--) {
      tmp = d;
      d = ty * d - dd + cof[j];
      dd = tmp;
    }

    const res = t * Math.exp(-x * x + 0.5 * (cof[0] + ty * d) - dd);

    return isneg ? res - 1 : 1 - res;
  }
}

/** Class representing a Truncated Normal Distribution. */
class TruncNormalDistribution {
  /**
   * @param  {number} mean
   * @param  {number} std - standard deviation
   * @param  {number} lo - lower limit
   * @param  {number} hi - upper limit
   */
  constructor(mean, std, lo, hi) {
    this.mu = mean;
    this.sigma = std;
    this.lo = lo;
    this.hi = hi;
  }

  /**
   * @returns {number} mean of truncated normal distribution
   */
  mean() {
    const norm = new NormalDistribution(0, 1);
    const numerator = norm.pdf(this.lo) - norm.pdf(this.hi);
    const denominator = norm.cdf(this.hi) - norm.cdf(this.lo);

    return this.mu + (numerator / denominator) * this.sigma;
  }
}

/** Class representing a Binomial Distribution. */
class BinomialDistribution {
  /**
   * @param  {number} n - number of trials
   * @param  {number} p - probability of success
   */
  constructor(n, p) {
    this.n = n;
    this.p = p;
  }

  /**
   * @returns {number} number of successes
   */
  sample() {
    let nSuccess = 0;

    for (let i = 0; i < this.n; i++) {
      nSuccess += Math.random() < this.p ? 1 : 0;
    }

    return nSuccess;
  }
}

/** Class representing a Exponential Distribution. */
class ExponentialDistribution {
  /**
   * @param  {number} rate - exponential distribution rate parameter
   */
  constructor(rate) {
    this.rate = rate;
  }

  /**
   * @returns  {number} - sample from distribution
   */
  sample() {
    return -1 * this.rate * Math.log(Math.random());
  }

  /**
   * @param  {number} size- number of samples
   * @returns {number} - sample average
   */
  samplesAvg(size) {
    let sampleSum = 0;

    for (let i = 0; i < size; i++) sampleSum += this.sample();
    return sampleSum / size;
  }
}

module.exports.NormalDistribution = NormalDistribution;
module.exports.TruncNormalDistribution = TruncNormalDistribution;
module.exports.BinomialDistribution = BinomialDistribution;
module.exports.ExponentialDistribution = ExponentialDistribution;
