document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('loginButton').addEventListener('click', () => {
        window.location.href = 'login.html';
    });

    document.getElementById('registerButton').addEventListener('click', () => {
        window.location.href = 'create.html';
    });
});
