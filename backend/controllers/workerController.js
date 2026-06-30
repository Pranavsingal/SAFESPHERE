const Worker = require('../models/mysql/Worker');

// @desc    Get all workers
// @route   GET /api/workers
// @access  Private
const getWorkers = async (req, res) => {
  try {
    const workers = await Worker.findAll();
    return res.status(200).json({
      success: true,
      count: workers.length,
      data: workers
    });
  } catch (error) {
    console.error('Get workers error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving workers list'
    });
  }
};

// @desc    Create a new worker
// @route   POST /api/workers
// @access  Private
const createWorker = async (req, res) => {
  const { id, name, role, status } = req.body;

  try {
    if (!id || !name || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide worker id, name, and role'
      });
    }

    // Check if worker already exists
    const workerExists = await Worker.findByPk(id);
    if (workerExists) {
      return res.status(400).json({
        success: false,
        message: `Worker with ID ${id} already exists`
      });
    }

    const worker = await Worker.create({
      id,
      name,
      role,
      status: status || 'Active'
    });

    return res.status(201).json({
      success: true,
      data: worker
    });
  } catch (error) {
    console.error('Create worker error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error creating worker profile'
    });
  }
};

// @desc    Update a worker
// @route   PUT /api/workers/:id
// @access  Private
const updateWorker = async (req, res) => {
  const { id } = req.params;
  const { name, role, status } = req.body;

  try {
    const worker = await Worker.findByPk(id);
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: `Worker with ID ${id} not found`
      });
    }

    // Update fields
    if (name) worker.name = name;
    if (role) worker.role = role;
    if (status) worker.status = status;

    await worker.save();

    return res.status(200).json({
      success: true,
      data: worker
    });
  } catch (error) {
    console.error('Update worker error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error updating worker profile'
    });
  }
};

// @desc    Delete a worker
// @route   DELETE /api/workers/:id
// @access  Private
const deleteWorker = async (req, res) => {
  const { id } = req.params;

  try {
    const worker = await Worker.findByPk(id);
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: `Worker with ID ${id} not found`
      });
    }

    await worker.destroy();

    return res.status(200).json({
      success: true,
      message: `Worker ${id} deleted successfully`
    });
  } catch (error) {
    console.error('Delete worker error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error deleting worker profile'
    });
  }
};

module.exports = {
  getWorkers,
  createWorker,
  updateWorker,
  deleteWorker
};
