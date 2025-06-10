export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs
    .toString()
    .padStart(2, '0')}`;
};

// Generates a unique ID using timestamp, random string, and an incrementing counter
export const generateUniqueId = (() => {
  let counter = 0;
  return () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    counter = (counter + 1) % 10000;
    return `${timestamp}-${random}-${counter}`;
  };
})();
