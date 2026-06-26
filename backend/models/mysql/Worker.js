const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');

const Worker = sequelize.define('Worker', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.STRING,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('Active', 'Inactive'),
    defaultValue: 'Active',
    allowNull: false
  }
}, {
  timestamps: true
});

module.exports = Worker;
