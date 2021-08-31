const loadData = require('./load-data');

module.exports = async () => {
  const loadedData = await loadData();

  global.loadedData = loadedData
};
