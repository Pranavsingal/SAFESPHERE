const { Op, fn, col } = require('sequelize');
const Alert = require('../models/mysql/Alert');
const Worker = require('../models/mysql/Worker');

// @desc    Get all alerts with optional filtering
// @route   GET /api/alerts
// @access  Private
const getAlerts = async (req, res) => {
  const { resolved, severity, workerId } = req.query;
  const whereClause = {};

  if (resolved !== undefined) {
    whereClause.resolved = resolved === 'true';
  }
  if (severity) {
    whereClause.severity = severity;
  }
  if (workerId) {
    whereClause.workerId = workerId;
  }

  try {
    const alerts = await Alert.findAll({
      where: whereClause,
      include: [
        {
          model: Worker,
          attributes: ['name', 'role']
        }
      ],
      order: [['timestamp', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      count: alerts.length,
      data: alerts
    });
  } catch (error) {
    console.error('Get alerts error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving alerts'
    });
  }
};

// @desc    Resolve a specific alert
// @route   PUT /api/alerts/:id
// @access  Private
const resolveAlert = async (req, res) => {
  const { id } = req.params;

  try {
    const alert = await Alert.findByPk(id);
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: `Alert with ID ${id} not found`
      });
    }

    alert.resolved = true;
    await alert.save();

    return res.status(200).json({
      success: true,
      message: `Alert ${id} resolved successfully`,
      data: alert
    });
  } catch (error) {
    console.error('Resolve alert error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error resolving alert'
    });
  }
};

// @desc    Get weekly historical reports of alerts
// @route   GET /api/reports/weekly
// @access  Private
const getWeeklyReport = async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // 1. Total incidents in last 7 days
    const totalAlerts = await Alert.count({
      where: {
        timestamp: {
          [Op.gte]: sevenDaysAgo
        }
      }
    });

    // 2. Incidents grouped by alert type
    const alertsByType = await Alert.findAll({
      attributes: [
        'type',
        [fn('COUNT', col('id')), 'count']
      ],
      where: {
        timestamp: {
          [Op.gte]: sevenDaysAgo
        }
      },
      group: ['type'],
      raw: true
    });

    // 3. Incidents grouped by severity
    const alertsBySeverity = await Alert.findAll({
      attributes: [
        'severity',
        [fn('COUNT', col('id')), 'count']
      ],
      where: {
        timestamp: {
          [Op.gte]: sevenDaysAgo
        }
      },
      group: ['severity'],
      raw: true
    });

    // 4. Alert counts per day (last 7 days)
    const alertsByDay = await Alert.findAll({
      attributes: [
        [fn('DATE', col('timestamp')), 'date'],
        [fn('COUNT', col('id')), 'count']
      ],
      where: {
        timestamp: {
          [Op.gte]: sevenDaysAgo
        }
      },
      group: [fn('DATE', col('timestamp'))],
      order: [[fn('DATE', col('timestamp')), 'ASC']],
      raw: true
    });

    // 5. Worker alert counts (ranking)
    const alertsByWorker = await Alert.findAll({
      attributes: [
        'workerId',
        [fn('COUNT', col('Alert.id')), 'count']
      ],
      include: [
        {
          model: Worker,
          attributes: ['name']
        }
      ],
      where: {
        timestamp: {
          [Op.gte]: sevenDaysAgo
        }
      },
      group: ['workerId', 'Worker.id'],
      order: [[fn('COUNT', col('Alert.id')), 'DESC']],
      limit: 5
    });

    return res.status(200).json({
      success: true,
      data: {
        timeframe: 'Last 7 Days',
        totalIncidents: totalAlerts,
        breakdownByType: alertsByType.reduce((acc, curr) => {
          acc[curr.type] = parseInt(curr.count);
          return acc;
        }, {}),
        breakdownBySeverity: alertsBySeverity.reduce((acc, curr) => {
          acc[curr.severity] = parseInt(curr.count);
          return acc;
        }, {}),
        trend: alertsByDay.map(day => ({
          date: day.date,
          count: parseInt(day.count)
        })),
        highestRiskWorkers: alertsByWorker.map(item => ({
          workerId: item.workerId,
          name: item.Worker ? item.Worker.name : 'Unknown',
          count: parseInt(item.getDataValue('count'))
        }))
      }
    });
  } catch (error) {
    console.error('Get weekly report error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error generating weekly report'
    });
  }
};

module.exports = {
  getAlerts,
  resolveAlert,
  getWeeklyReport
};
