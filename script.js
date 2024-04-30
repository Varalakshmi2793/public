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
                        
                    const useritem = document.createElement('li');
                    const usertext = document.createTextNode(`${element.expenseamount}, ${element.description}, ${element.category}`);
                    useritem.appendChild(usertext);
                    userlist.appendChild(useritem);
                    const delbutton = document.createElement('button');
                    delbutton.textContent = "Delete";
                    delbutton.addEventListener('click', async () => {
                        try {
                            await fetch(`/expense/delexpense/${element.id}`, {
                                method: 'DELETE',
                                headers: { "Authorization": token }
                            });

                        } catch (error) {
                            console.log(error);
                        }
                    });
                    useritem.appendChild(delbutton);
                    userlist.appendChild(useritem);
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
                const downloadbtn = document.getElementById('downloadexpense');
                downloadbtn.disabled = false;
                const historybtn=document.getElementById('downlaodhistory');
                historybtn.disabled = false;

            }
        } catch (err) {
            console.log(err);
        }
    }

    document.getElementById('razorpaybtn').onclick = async function (e) {
        const token = localStorage.getItem('token');
        const headers = { "Authorization": token };
        console.log(headers)
        try {
            const response = await fetch('/purchase/premium', { headers });
            if (response.ok) {
                const data = await response.json();
                if (data && data.order && data.order.id) {
                    const orderId = data.order.id;
                    console.log(orderId);
                    const options = {
                        "key": data.key_id,
                        "order_id": orderId,
                        "handler": async function (response) {
                            try {
                                const transactionResponse = await fetch('/purchase/transaction', {
                                    method: 'POST',
                                    headers: { "Authorization": token, "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                        order_id: orderId,
                                        payment_id: response.razorpay_payment_id,
                                    })
    
                                });
                                await fetch('/purchase/userstatus', {
                                    method: 'POST',
                                    headers: { "Authorization": token }
                                });
    
    
                                alert("you are a prmium user");
                                document.getElementById('razorpaybtn').style.visibility = "hidden";
                                document.getElementById('premiumMessage').textContent = "You are now a premium user";
                               
                                await checkPremiumStatus();
                                
                            } catch (transactionError) {
                                console.error('Transaction error:', transactionError);
                                alert("Transaction error occurred");
                            }
                        }
                    };
                    const rzpl = new Razorpay(options);
                    rzpl.open();
                    e.preventDefault();
                    rzpl.on('payment.failed', function (response) {
                        console.log(response);
                        alert("Payment failed");
                    });
                } else {
                    console.error('Invalid response data:', data);
                    alert("Invalid response data");
                }
            } else {
                console.error('Failed to fetch premium purchase:', response.statusText);
                alert("Failed to fetch premium purchase");
    
               
            }
        } catch (error) {
            console.error('Error:', error);
            alert("An error occurred");
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

    async function download() {
        try {
            const token = localStorage.getItem('token');

            const response = await fetch('/user/download', {
                method: 'GET',
                headers: { "Authorization": token }
            });

            if (response.ok) {
                const data = await response.json();
                const fileUrl = data.fileURL;

                const a = document.createElement("a");
                a.href = fileUrl;
                a.download = 'Tracker.txt';
                a.click();
            } else {
                throw new Error('Failed to download file');
            }
        } catch (error) {
            console.error('Error downloading file:', error);
            showError(error.message); 
        }
    }
    async function downloadhistory() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/user/history', {
                headers: { "Authorization": token }
            });
            if (response.ok) {
                const data = await response.json();
                const datas= data.urlFiles;
                console.log(datas); 
                const div = document.getElementById('history');
                datas.forEach((url) => {
                    const list = document.createElement('li'); 
                    const text= document.createTextNode(`${url.url}`);
                    list.appendChild(text); 
                    div.appendChild(list);
                });
            } else {
                console.log("No URLs found");
            }
        } catch (error) {
            console.log(error);
        }
    }
    
    