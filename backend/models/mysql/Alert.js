const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');
const Worker = require('./Worker');

const Alert = sequelize.define('Alert', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  workerId: {
    type: DataTypes.STRING(36),
    allowNull: false,
    field: 'worker_id',
    references: {
      model: Worker,
      key: 'id'
    }
  },
  type: {
    type: DataTypes.STRING(50),
    allowNull: false // e.g. 'FALL', 'HEART_RATE_ANOMALY', 'HEAT_STRESS', 'SOS'
  },
  severity: {
    type: DataTypes.STRING(20),
    allowNull: false // e.g. 'WARNING', 'CRITICAL'
  },
  message: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'ACTIVE' // ACTIVE, ACKNOWLEDGED, RESOLVED
  }
}, {
  tableName: 'alerts',
  timestamps: true,
  createdAt: 'timestamp',
  updatedAt: 'updated_at'
});

// Setup relationships
Worker.hasMany(Alert, { foreignKey: 'worker_id', onDelete: 'CASCADE' });
Alert.belongsTo(Worker, { foreignKey: 'worker_id' });

module.exports = Alert;
