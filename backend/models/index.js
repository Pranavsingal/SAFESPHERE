const { sequelize } = require('../config/db');
const Worker = require('./mysql/Worker');
const Alert = require('./mysql/Alert');
const User = require('./mysql/User');
const SensorData = require('./mongo/SensorData');

// Define database associations
Worker.hasMany(Alert, { foreignKey: 'workerId', onDelete: 'CASCADE' });
Alert.belongsTo(Worker, { foreignKey: 'workerId' });


// MySQL sync and seed
const syncMySQL = async (force = false) => {
  try {
    await sequelize.sync({ force });
    console.log('MySQL Database schema synchronized successfully');

    // Seed default workers if the table is empty
    const workerCount = await Worker.count();
    if (workerCount === 0) {
      await Worker.bulkCreate([
        { id: 'W-001', name: 'John Doe', role: 'Welder', status: 'Active' },
        { id: 'W-002', name: 'Jane Smith', role: 'Electrician', status: 'Active' },
        { id: 'W-003', name: 'Mike Johnson', role: 'Scaffolder', status: 'Active' },
        { id: 'W-004', name: 'Alice Brown', role: 'Safety Inspector', status: 'Active' }
      ]);
      console.log('Seeded default workers in MySQL');
    }
  } catch (error) {
    console.error('Error during MySQL sync/seed:', error.message);
  }
};

module.exports = {
  sequelize,
  Worker,
  Alert,
  User,
  SensorData,
  syncMySQL
};
