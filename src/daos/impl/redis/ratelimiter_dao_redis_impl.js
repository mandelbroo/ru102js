const redis = require("./redis_client");
const keyGenerator = require("./redis_key_generator");

/**
 * Record a hit against a unique resource that is being
 * rate limited.  Will return 0 when the resource has hit
 * the rate limit.
 * @param {string} name - the unique name of the resource.
 * @param {Object} opts - object containing interval and maxHits details:
 *   {
 *     interval: 1,
 *     maxHits: 5
 *   }
 * @returns {Promise} - Promise that resolves to number of hits remaining,
 *   or 0 if the rate limit has been exceeded..
 *
 * @private
 */
const hitFixedWindow = async (name, opts) => {
  const client = redis.getClient();
  const key = keyGenerator.getRateLimiterKey(name, opts.interval, opts.maxHits);

  const pipeline = client.batch();

  pipeline.incr(key);
  pipeline.expire(key, opts.interval * 60);

  const response = await pipeline.execAsync();
  const hits = parseInt(response[0], 10);

  let hitsRemaining;

  if (hits > opts.maxHits) {
    // Too many hits.
    hitsRemaining = 0;
  } else {
    // Return number of hits remaining.
    hitsRemaining = opts.maxHits - hits;
  }

  return hitsRemaining;
};

/* eslint-disable no-unused-vars */
// Challenge 7
const hitSlidingWindow = async (name, opts) => {
  const client = redis.getClient();

  // START Challenge #7
  const interval = (opts.interval || 1) * 60;
  const limiter = opts.limiter || "sliding";
  const maxHits = opts.maxHits || 5;

  const pipe = client.multi();

  const key = `${limiter}:${interval}:${name}:${maxHits}`;
  const score = Date.now();
  const value = "abcdefg"
    .split("")
    .sort(() => Math.random() - Math.random())
    .join("");

  pipe.zadd(key, score, value);
  pipe.zremrangebyscore(key, 0, score - interval * 1e3);
  pipe.zcard(key);

  const result = await pipe.execAsync();
  const [, , hits] = result;

  return hits <= maxHits ? maxHits - hits : 0;
  // END Challenge #7
};
/* eslint-enable */

module.exports = {
  /**
   * Record a hit against a unique resource that is being
   * rate limited.  Will return 0 when the resource has hit
   * the rate limit.
   * @param {string} name - the unique name of the resource.
   * @param {Object} opts - object containing interval and maxHits details:
   *   {
   *     interval: 1,
   *     maxHits: 5
   *   }
   * @returns {Promise} - Promise that resolves to number of hits remaining,
   *   or 0 if the rate limit has been exceeded..
   */
  hit: hitSlidingWindow // Challenge 7: change to hitSlidingWindow
};
