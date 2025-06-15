// Redis-based distributed locking service for preventing race conditions

const acquireLock = async (redisClient, lockKey, timeout = 10000) => {
  try {
    const lockValue = `${Date.now()}-${Math.random()}`;
    const result = await redisClient.set(lockKey, lockValue, {
      PX: timeout, // Expire after timeout milliseconds
      NX: true     // Only set if key doesn't exist
    });
    
    return result === 'OK';
  } catch (error) {
    console.error('Error acquiring lock:', error);
    return false;
  }
};

const releaseLock = async (redisClient, lockKey) => {
  try {
    await redisClient.del(lockKey);
    return true;
  } catch (error) {
    console.error('Error releasing lock:', error);
    return false;
  }
};

const extendLock = async (redisClient, lockKey, timeout = 10000) => {
  try {
    const result = await redisClient.expire(lockKey, Math.floor(timeout / 1000));
    return result === 1;
  } catch (error) {
    console.error('Error extending lock:', error);
    return false;
  }
};

module.exports = {
  acquireLock,
  releaseLock,
  extendLock
};
