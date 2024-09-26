const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser'); // Add cookie-parser

const app = express();
app.use(cors());
app.use(express.json());
app.use(cookieParser()); // Use cookie-parser middleware

// Paths
const usersFilePath = './users.json'; // Path for user data
const tasksFilePath = './todos.json'; // Path for tasks data
const JWT_SECRET = 'your_jwt_secret'; // Secure your secret

// Utility function to read users from the JSON file
const getUsers = () => {
  try {
    const data = fs.readFileSync(usersFilePath);
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
};

// Utility function to save users to the JSON file
const saveUsers = (users) => {
  fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
};

// Utility function to read tasks from the JSON file
const getTasks = () => {
  try {
    const data = fs.readFileSync(tasksFilePath);
    return JSON.parse(data);
  } catch (err) {
    return []; // Return empty array if there is an error
  }
};

// Utility function to save tasks to the JSON file
const saveTasks = (tasks) => {
  fs.writeFileSync(tasksFilePath, JSON.stringify(tasks, null, 2));
};

// Serve static files from the 'frontend' directory
app.use(express.static(path.join(__dirname, 'frontend')));

// Route handling
app.get('/HomePage', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'login.html'));
});
// Login POST route
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Get users from JSON
  const users = getUsers();

  // Find the user
  const user = users.find(user => user.username === username && user.password === password);

  if (user) {
    // Generate JWT token
    const token = jwt.sign({ username: user.username }, JWT_SECRET);

    // Log the confirmation in the console
    console.log(`Username: ${username}, Password: ${password}, Token: ${token}`);

    // Set token in cookie
    res.cookie('token', token, { httpOnly: true }); // Set token cookie

    // Respond with success and token
    return res.status(200).json({ message: 'Login successful', token });
  } else {
    return res.status(403).json({
      message: "Invalid username or password"
    });
  }
});


// Signup route
app.post('/signup', (req, res) => {
  const { username, password } = req.body;
  const users = getUsers();

  // Check if user already exists
  const userExists = users.some(user => user.username === username);
  if (userExists) {
    return res.status(400).send('User already exists');
  }

  const newUser = { username, password };
  users.push(newUser);
  saveUsers(users);

  res.status(201).send('User registered successfully');
});

// Serve the signup page
app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'signup.html'));
});

// Middleware to authenticate JWT
function authenticateToken(req, res, next) {
  const token = req.cookies.token; // Use cookie to get the token
  if (!token) {
    return res.status(401).redirect('/login'); // Redirect to login if not authenticated
  }

  jwt.verify(token, JWT_SECRET, (err) => {
    if (err) {
      return res.status(403).redirect('/login'); // Redirect if token is invalid
    }
    next();
  });
}

// Serve tasks page (protected)
app.get('/tasks', authenticateToken,(req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'tasks.html'));
});

// Route to fetch all tasks
app.get('/tasks', authenticateToken, (req, res) => {
  const tasks = getTasks();
  res.json(tasks); // Send all tasks as a response
});

// Route to add a new task
app.post('/tasks', authenticateToken, (req, res) => {
  const tasks = getTasks();
  const newTask = req.body;
  newTask.id = tasks.length; // Assign a unique ID
  tasks.push(newTask);
  saveTasks(tasks);
  res.status(201).json(newTask); // Return the newly created task
});

// Route to update a task
app.put('/tasks/:id', authenticateToken, (req, res) => {
  const tasks = getTasks();
  const taskId = parseInt(req.params.id, 10);
  const updatedTask = req.body;

  const taskIndex = tasks.findIndex(task => task.id === taskId);
  if (taskIndex !== -1) {
    tasks[taskIndex] = { ...tasks[taskIndex], ...updatedTask };
    saveTasks(tasks);
    res.json(tasks[taskIndex]); // Respond with the updated task
  } else {
    res.status(404).json({ message: 'Task not found' });
  }
});

// Route to delete a task
app.delete('/tasks/:id', authenticateToken, (req, res) => {
  const tasks = getTasks();
  const taskId = parseInt(req.params.id, 10);

  const taskIndex = tasks.findIndex(task => task.id === taskId);
  if (taskIndex !== -1) {
    const removedTask = tasks.splice(taskIndex, 1);
    saveTasks(tasks);
    res.json(removedTask);
  } else {
    res.status(404).json({ message: 'Task not found' });
  }
});

// Logout POST route
app.post('/logout', (req, res) => {
  const token = req.cookies.token; // Assuming the token is stored in cookies

  if (!token) {
    return res.status(400).json({ message: 'No token provided' });
  }

  // Verify and decode the token
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    const { username } = decoded;

    // Get users from the JSON file
    const users = getUsers();

    // Find the user by username
    const user = users.find(user => user.username === username);

    if (user) {
      // Clear the token for the user
      user.token = null;

      // Save the updated users array back to the users.json
      fs.writeFileSync('users.json', JSON.stringify(users, null, 2));

      // Clear the token from the cookies
      res.clearCookie('token', { httpOnly: true });

      return res.status(200).json({ message: 'Logout successful' });
    } else {
      return res.status(404).json({ message: 'User not found' });
    }
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}/HomePage`);
});
