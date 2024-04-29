const form = document.getElementById('form-control');
const userlist = document.getElementById('list-id');

window.addEventListener('load', async () => {
    await updateuserdetails();
    await checkPremiumStatus();
});

function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Error parsing JWT:', error);
        return null;
    }
}

form.addEventListener('submit', async function (event) {
    event.preventDefault();
    const token = localStorage.getItem('token');
    const expenseamount = document.getElementById("expenseamount").value;
    const description = document.getElementById("description").value;
    const category = document.getElementById("choose_category").value;

    try {
        const response = await fetch('/expense/addexpense', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                "Authorization": token
            },
            body: JSON.stringify({ expenseamount, description, category })
        });

        if (response.ok) {
            console.log(response);
            form.reset();

        } else {
            console.log("User details not submitted");
        }
    } catch (err) {
        console.log(err);
    }
});

async function updateuserdetails() {
    try {
        const token = localStorage.getItem('token');

        const headers = { "Authorization": token };

        const response = await fetch('/expense/getexpense', { headers });

        if (response.ok) {
            const datas = await response.json();
            userlist.innerHTML='<h2>Expense</h2>';
            datas.forEach(element => {
                const row = document.createElement('tr');
                const expenseamountCell = document.createElement('td');
                expenseamountCell.textContent = element.expenseamount;
                row.appendChild(expenseamountCell);

                const descriptionCell = document.createElement('td');
                descriptionCell.textContent = element.description;
                row.appendChild(descriptionCell);

                const categoryCell = document.createElement('td');
                categoryCell.textContent = element.category;
                row.appendChild(categoryCell);

                const dateCell = document.createElement('td');
                const date = new Date(element.createdAt); 
                dateCell.textContent = formatDate(date);
                row.appendChild(dateCell);

                const deleteButtonCell = document.createElement('td');
                const deleteButton = document.createElement('button');
                deleteButton.textContent = "Delete";
                deleteButton.addEventListener('click', async () => {
                    try {
                        await fetch(`/expense/delexpense/${element.id}`, {
                            method: 'DELETE',
                            headers: { "Authorization": token }
                        });

                        
                        await updateuserdetails();
                    } catch (error) {
                        console.log(error);
                    }
                });
                deleteButtonCell.appendChild(deleteButton);
                row.appendChild(deleteButtonCell);

                userlist.appendChild(row);
            });
        } else {
            console.error('Fetch request failed:', response.statusText);
        }

    } catch (error) {
        console.log(error);
    }
}

async function checkPremiumStatus() {
    try {
        const token = localStorage.getItem('token');
        const decodedToken = parseJwt(token);

        if (decodedToken.ispremiumuser) {
            document.getElementById('razorpaybtn').style.visibility = "hidden";
            document.getElementById('premiumMessage').textContent = "You are now a premium user";

            const leaderboardButton = document.createElement('button');
            leaderboardButton.textContent = 'Show Leaderboard';
            leaderboardButton.onclick = fetchLeaderboard; 
            document.getElementById('premiumMessage').appendChild(leaderboardButton);
            const downloadButton = document.getElementById('downloadButton');
            downloadButton.disabled = false;
        }
    } catch (err) {
        console.log(err);
    }
}

async function fetchLeaderboard() {
    try {
        const token= localStorage.getItem('token');
        const response = await fetch('/api/leaderboard', {headers: { "Authorization": token }});
        console.log(response);
        if (response.ok) {
            const data = await response.json();
            const leaderboardElement = document.getElementById('leaderboard');
            leaderboardElement.innerHTML = '<h2>Leaderboard</h2>';
            data.leaderboard.forEach((user) => {
                leaderboardElement.innerHTML += `<p>Name --> ${ user.username } && Total Expense--> ${user.totalexpense}</p>`;
            });
        } else {
            console.error('Failed to fetch leaderboard:', response.statusText);
        }
    } catch (error) {
        console.error('Error fetching leaderboard data:', error);
    }
}

async function filterExpensesIncomes() {
    const token = localStorage.getItem('token');
    const headers = { "Authorization": token };
    const timePeriodSelect = document.getElementById('timePeriodSelect');

    try {
        const response = await fetch('/expense/getexpense', { headers });
        if (!response.ok) {
            throw new Error('Failed to fetch expenses');
        }
        
        const expenses = await response.json();
        const timePeriod = timePeriodSelect.value;
        const today = new Date();

        const filteredData = expenses.filter(item => {
            const itemDate = new Date(item.createdAt); 
            if (timePeriod === 'daily') {
                return itemDate.toDateString() === today.toDateString();
            } else if (timePeriod === 'weekly') {
                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() - today.getDay());
                return itemDate >= startOfWeek && itemDate <= today;
            } else if (timePeriod === 'monthly') {
                return itemDate.getMonth() === today.getMonth() && itemDate.getFullYear() === today.getFullYear();
            }
        });

        displayFilteredExpensesIncomes(filteredData, timePeriod);
    } catch (error) {
        console.error('Error filtering expenses:', error);
    }
}

function displayFilteredExpensesIncomes(filteredData, timePeriod) {
    const tableContainer = document.getElementById('table-container');
    tableContainer.innerHTML = ''; 

    const table = document.createElement('table');
    table.border = "1";

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = `<th>Type</th><th>Description</th><th>Amount</th><th>Date</th>`;
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    filteredData.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${item.category}</td><td>${item.description}</td><td>${item.expenseamount}</td><td>${formatDate(new Date(item.createdAt))}</td>`; // Adjust property names to match your database structure
        tbody.appendChild(row);
    });
    table.appendChild(tbody);


    const heading = document.createElement('h2');
    heading.textContent = `${timePeriod.charAt(0).toUpperCase() + timePeriod.slice(1)} Report`;
    tableContainer.appendChild(heading);

    tableContainer.appendChild(table);
}

const timePeriodSelect = document.getElementById('timePeriodSelect');
if (timePeriodSelect) {
    timePeriodSelect.addEventListener('change', filterExpensesIncomes);
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function downloadExpenses() {
    const timePeriod = timePeriodSelect.value; 
    const dataToDownload = userlist.innerHTML;
    const heading = `${timePeriod.charAt(0).toUpperCase() + timePeriod.slice(1)} Report`;

    const tableHtml = `
        <h2>${heading}</h2>
        <table border="1">
            <thead>
                <tr>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Date</th>
                </tr>
            </thead>
            <tbody>
                ${dataToDownload}
            </tbody>
        </table>
    `;
    const blob = new Blob([tableHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${timePeriod}_expenses.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

document.getElementById('downloadButton').addEventListener('click', downloadExpenses);
