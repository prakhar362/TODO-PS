const addNewButtons = document.querySelectorAll('.add');
const popupForm = document.getElementById('popupForm');
const closePopup = document.getElementById('closePopup');
let selectedSection;
let currentTaskCard = null;
let currentTaskId = null; // Track whether we're adding a new task or editing an existing one
const BACKEND_URL = 'https://taskify-todoweb.onrender.com'; // Your backend URL
let authToken = localStorage.getItem('token'); // Retrieve JWT token from local storage

// Fetch all tasks from the server when the page loads
window.addEventListener('load', () => {
    fetchTasks();
});

// Function to fetch tasks
function fetchTasks() {
    fetch(`${BACKEND_URL}/tasks`, {
        headers: {
            'Authorization': `Bearer ${authToken}`
        }
    })
        .then(response => {
            if (response.status === 401) {
                alert('Session expired. Please log in again.');
                window.location.href = 'login.html'; // Redirect to login if unauthorized
                return;
            }
            return response.json();
        })
        .then(tasks => {
            tasks.forEach(task => createTaskCard(task));
        })
        .catch(err => console.error('Error fetching tasks:', err));
}

// Add new task button functionality
addNewButtons.forEach(button => {
    button.addEventListener('click', (event) => {
        popupForm.style.display = 'flex';
        selectedSection = event.target.closest('.section');
        currentTaskId = null; // Reset to null to indicate a new task is being added
        currentTaskCard = null;
        resetFormFields(); // Reset form fields for new task input
    });
});

// Close popup functionality
closePopup.addEventListener('click', () => {
    popupForm.style.display = 'none';
    resetFormFields();
});

// Edit and update task functionality
document.addEventListener('click', function(event) {
    if (event.target.closest('.edit-task')) {
        const taskCard = event.target.closest('.task-card');
        if (taskCard) {
            currentTaskId = taskCard.getAttribute('data-task-id'); // Fetch task ID from data attribute
            document.getElementById('taskName').value = taskCard.querySelector('h3').textContent;
            document.getElementById('difficulty').value = taskCard.querySelector('p:nth-of-type(1)').textContent.replace('Difficulty: ', '').toLowerCase();
            document.getElementById('deadline').value = taskCard.querySelector('p:nth-of-type(2)').textContent.replace('Deadline: ', '');
            document.getElementById('lastModified').value = taskCard.querySelector('p:nth-of-type(3)').textContent.replace('Last Modified: ', '');
            popupForm.style.display = 'flex';
        }
    }
    else if (event.target.closest('.delete-task')) {
        const taskCard = event.target.closest('.task-card');
        const taskId = taskCard.dataset.taskId;

        // Delete task from the server
        fetch(`${BACKEND_URL}/tasks/${taskId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        })
            .then(response => {
                if (response.ok) {
                    taskCard.remove();
                    alert('Task deleted successfully!');
                } else {
                    alert('Error deleting task. Please try again.');
                }
            })
            .catch(err => alert('Error deleting task: ' + err)); // Handle errors while deleting
    }
});

// Save or update task when save button is clicked
document.getElementById('saveTask').addEventListener('click', function(event) {
    event.preventDefault();

    const taskName = document.getElementById('taskName').value;
    const difficulty = document.getElementById('difficulty').value;
    const deadline = document.getElementById('deadline').value;
    const lastModified = new Date().toISOString().split('T')[0]; // Set the last modified date to today's date

    if (taskName === "" || deadline === "") {
        alert("Please fill in all the required fields!");
        return;
    }

    const taskData = {
        name: taskName,
        difficulty,
        deadline,
        lastModified
    };

    if (currentTaskId) {
        // Update existing task on the server via PUT request
        fetch(`${BACKEND_URL}/tasks/${currentTaskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(taskData)
        })
        .then(response => response.json())
        .then(updatedTask => {
            // Update task on frontend
            const taskCard = document.querySelector(`.task-card[data-task-id="${currentTaskId}"]`);
            if (taskCard) {
                taskCard.querySelector('h3').textContent = updatedTask.name;
                taskCard.querySelector('p:nth-of-type(1)').textContent = `Difficulty: ${updatedTask.difficulty}`;
                taskCard.querySelector('p:nth-of-type(2)').textContent = `Deadline: ${updatedTask.deadline}`;
                taskCard.querySelector('p:nth-of-type(3)').textContent = `Last Modified: ${updatedTask.lastModified}`;
            }

            alert('Task updated successfully!');
            popupForm.style.display = 'none';
            resetFormFields();
        })
        .catch(err => alert('Error updating task: ' + err)); // Handle errors during update
    } else {
        // Create a new task on the server via POST request
        fetch(`${BACKEND_URL}/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ ...taskData, section: selectedSection.id })
        })
        .then(response => response.json())
        .then(newTask => {
            // Add the new task to the frontend
            createTaskCard(newTask);
            alert('Task added successfully!');
            popupForm.style.display = 'none';
            resetFormFields();
        })
        .catch(err => alert('Error adding task: ' + err)); // Handle errors during addition
    }
});

// Helper to create a new task card
function createTaskCard(task) {
    const taskCard = document.createElement('div');
    taskCard.classList.add('task-card');
    taskCard.dataset.taskId = task.id;
    taskCard.innerHTML = `
        <h3>${task.name}</h3>
        <p><strong>Difficulty:</strong> ${task.difficulty}</p>
        <p><strong>Deadline:</strong> ${task.deadline}</p>
        <p><strong>Last Modified:</strong> ${task.lastModified}</p>
        <div class="task-icons">
            <button class="delete-task"><img src="https://cdn-icons-png.freepik.com/256/4980/4980658.png?semt=ais_hybrid" alt="delete"></button>
            <button class="edit-task"><img src="https://cdn-icons-png.flaticon.com/512/1375/1375128.png" alt="edit"></button>
        </div>
    `;
    document.getElementById(task.section).appendChild(taskCard);
}

// Initialize Sortable for each section
const sections = document.querySelectorAll('.section');

sections.forEach(section => {
    new Sortable(section, {
        group: 'tasks', // Set the group name to allow movement between sections
        animation: 150, // Animation speed in ms
        draggable: '.task-card', // The class of the draggable items
        ghostClass: 'sortable-ghost', // Class applied when dragging over
        onEnd: function (evt) {
            console.log(`Task moved to ${evt.to.id}`);
        }
    });
});

// Reset form fields after saving or closing the popup
function resetFormFields() {
    document.getElementById('taskName').value = '';
    document.getElementById('difficulty').value = 'easy';
    document.getElementById('deadline').value = '';
    document.getElementById('lastModified').value = '';
}

document.getElementById('logout').addEventListener('click', async () => {
    try {
        const response = await fetch('https://taskify-todoweb.onrender.com/logout', {
            method: 'POST',
            credentials: 'include' // Include cookies with the request
        });

        if (response.ok) {
            // Clear the token from localStorage
            localStorage.removeItem('token');
            // Redirect to login page
            window.location.href = 'login.html';
        } else {
            const errorData = await response.json();
            alert('Logout failed: ' + errorData.message);
        }
    } catch (error) {
        console.error('Error during logout:', error);
        alert('An error occurred during logout.');
    }
});

