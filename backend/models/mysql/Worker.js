const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');

const Worker = sequelize.define('Worker', {
  id: {
    type: DataTypes.STRING(36),
    primaryKey: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  role: {
    type: DataTypes.STRING(50),
    defaultValue: 'Operator'
  },
  zone: {
    type: DataTypes.STRING(50),
    defaultValue: 'Main Area'
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'Active' // Active, Suspended, Inactive
  }
}, {
  tableName: 'workers',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Worker;
