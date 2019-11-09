const config = require("better-config");
const redis = require("../src/daos/impl/redis/redis_client");
const redisRateLimiterDAO = require("../src/daos/impl/redis/ratelimiter_dao_redis_impl");
const keyGenerator = require("../src/daos/impl/redis/redis_key_generator");

const testSuiteName = "ratelimiter_dao_redis_impl";

const testKeyPrefix = `test:${testSuiteName}`;

config.set("../config.json");
keyGenerator.setPrefix(testKeyPrefix);
const client = redis.getClient();

/* eslint-disable no-undef, no-await-in-loop */

afterEach(async () => {
  const testKeys = await client.keysAsync(`${testKeyPrefix}:*`);

  if (testKeys.length > 0) {
    await client.delAsync(testKeys);
  }
});

afterAll(() => {
  // Release Redis connection.
  client.quit();
});

const runRateLimiter = async (limiterOpts, iterations) => {
  let remaining = limiterOpts.maxHits;
  const resource = "testresource" + Date.now().toString().slice(8, 13);

  for (let n = 0; n < iterations; n += 1) {
    if (remaining > 0) {
      remaining -= 1;
    }

    const remains = await redisRateLimiterDAO.hit(resource, limiterOpts);
    expect(remains).toBe(remaining);
  }
};

test.skip(`${testSuiteName}: hit (fixed window limit not exceeded)`, async () => {
  await runRateLimiter({
    interval: 1,
    maxHits: 5,
  }, 5);
});

test.skip(`${testSuiteName}: hit (fixed window limit exceeded)`, async () => {
  await runRateLimiter({
    interval: 1,
    maxHits: 5,
  }, 7);
});

// Challenge 7.
test(`${testSuiteName}: hit (sliding window limit not exceeded)`, async () => {
  await runRateLimiter({
    interval: 1,
    maxHits: 5,
  }, 5);
});

// Challenge 7.
test(`${testSuiteName}: hit (sliding window limit exceeded)`, async () => {
  await runRateLimiter({
    interval: 1,
    maxHits: 5,
  }, 7);
});

/* eslint-enable */
