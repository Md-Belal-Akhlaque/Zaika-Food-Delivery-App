const formatLog = (level, message, meta = {}) => {
  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  };
  return JSON.stringify(payload);
};

export const logger = {
  info: (message, meta = {}) => {
    console.log(formatLog("info", message, meta));
  },
  warn: (message, meta = {}) => {
    console.warn(formatLog("warn", message, meta));
  },
  error: (message, meta = {}) => {
    console.error(formatLog("error", message, meta));
  },
};

export default logger;
