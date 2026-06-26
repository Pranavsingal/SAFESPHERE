const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/mysql/User');
require('dotenv').config();

// Generate JWT Helper
const generateToken = (id, username, name) => {
  return jwt.sign(
    { id, username, name },
    process.env.JWT_SECRET || 'safesphere_jwt_secret_key',
    { expiresIn: '30d' }
  );
};

// @desc    Register a new supervisor
// @route   POST /api/auth/register
// @access  Public
const registerSupervisor = async (req, res) => {
  const { username, password, name } = req.body;

  try {
    if (!username || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, username, and password'
      });
    }

    // Check if user already exists
    const userExists = await User.findOne({ where: { username } });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'Supervisor username already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const newUser = await User.create({
      name,
      username,
      password: hashedPassword
    });

    return res.status(201).json({
      success: true,
      data: {
        id: newUser.id,
        name: newUser.name,
        username: newUser.username,
        token: generateToken(newUser.id, newUser.username, newUser.name)
      }
    });
  } catch (error) {
    console.error('Registration error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error during supervisor registration'
    });
  }
};

// @desc    Auth supervisor & get token
// @route   POST /api/auth/login
// @access  Public
const loginSupervisor = async (req, res) => {
  const { username, password } = req.body;

  try {
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username and password'
      });
    }

    // Find supervisor
    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        username: user.username,
        token: generateToken(user.id, user.username, user.name)
      }
    });
  } catch (error) {
    console.error('Login error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error during supervisor login'
    });
  }
};

module.exports = {
  registerSupervisor,
  loginSupervisor
};
