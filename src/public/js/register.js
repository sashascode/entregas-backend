const onSubmit = async () => {
    try {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const name = document.getElementById('name').value;
        const lastName = document.getElementById('lastName').value;
        const age = document.getElementById('age').value;
    
        const response = await fetch('/api/users/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password, confirmPassword, name, lastName, age }),
        });
        const data = await response.json();
        if (data.error) {
            displayError(data.error);
        } else {
            window.location.href = '/views/login';
        }

        return false;
    }
    catch (error) {
        console.log("error: ", error);
    }
}

const displayError = (errorMsg) => {
    const errorEl = document.getElementById('error');
    errorEl.style.display = 'block';
    errorEl.innerHTML = errorMsg;
}