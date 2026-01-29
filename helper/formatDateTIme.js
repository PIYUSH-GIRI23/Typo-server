const formatDateTime = (timestamp) => {
  try {
    if (!timestamp || isNaN(timestamp)) {
      throw new Error('Invalid timestamp provided');
    }

    const date = new Date(timestamp);

    // Format date as YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    // Format time as HH:MM:SS
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const timeString = `${hours}:${minutes}:${seconds}`;

    return {
      date: dateString,
      time: timeString,
      dateTime: `${dateString} ${timeString}`,
    };
  } catch (error) {
    throw new Error(`Date formatting failed: ${error.message}`);
  }
};

export default formatDateTime;

