const User = require('../models/User');
const Note = require('../models/Note');
const bcrypt = require('bcrypt');

// @desc Get All Users
// @router GET /users
// @access Private
const getAllUsers = async (req, res) => {
    const users = await User.find().select('-password').lean();
    if (!users?.length) {
        return res.status(400).json({ message: "No users found" })
    }
    res.json(users);
}

// @desc Create new User
// @router POST /users
// @access Private
const createNewUser = async (req, res) => {
    const { username, password, roles } = req.body;

    // confirm data
    if (!username || !password) {
        return res.status(400).json({ messgae: "All fields are required" })
    }

    // check for duplicate
    const duplicate = await User.findOne({ username: username }).collation({ locale: 'en', strength: 2 }).lean().exec();

    if (duplicate) {
        return res.status(409).json({ message: "Duplicate username" })
    }

    // Hash Password
    const hashedPwd = await bcrypt.hash(password, 10)

    const userObject = (!Array.isArray(roles) || !roles.length)
        ? { username, "password": hashedPwd }
        : { username, "password": hashedPwd, roles }

    // Create and store new user
    const user = User.create(userObject)

    if (user) {
        res.status(201).json({ message: `new user ${username} created ` })
    } else {
        res.status(400).json({ messgae: "Invalid user data received" })
    }
}

// @desc Update User
// @router PATCH /users
// @access Private
const updateUser = async (req, res) => {
    const { id, username, roles, active, password } = req.body;

    // Confirm data
    if (!id || !username || !Array.isArray(roles) || !roles.length || typeof active !== 'boolean') {
        return res.status(400).json({ "message": "All fields are required" })
    }

    const user = await User.findById(id).exec()

    if (!user) {
        return res.status(400).json({ message: "User not found" })
    }

    const duplicate = await User.findOne({ username }).collation({ locale: 'en', strength: 2 }).lean().exec()

    if (duplicate && duplicate?._id.toString() !== id) {
        return res.status(409).json({ message: "Duplicate username" })
    }

    user.username = username
    user.roles = roles
    user.active = active

    if (password) {
        // Hash password
        user.password = await bcrypt.hash(password, 10)
    }

    const updatedUser = await user.save()

    res.json({ message: `${updatedUser.username} updated` })
}

// @desc Delete User
// @router DELETE /users
// @access Private
const deleteUser = async (req, res) => {
    const { id } = req.body;

    if (!id) {
        return res.status(400).json({ message: "User Id Required" })
    }

    const note = await Note.findOne({ user: id }).lean().exec();
    if (note) {
        return res.status(400).json({ message: "User has assigned notes" })
        // Requirement is not to delete user if user is assigned a note 
    }

    const user = await User.findById(id).exec();

    if (!user) {
        return res.status(400).json({ message: "User not found" })
    }

    const result = await user.deleteOne()

    const reply = `Username ${result.username} with ID ${result._id} deleted`

    res.json(reply)
}



module.exports = {
    getAllUsers,
    createNewUser,
    updateUser,
    deleteUser
};