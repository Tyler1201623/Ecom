document.addEventListener('DOMContentLoaded', () => {
    const darkModeSwitch = document.getElementById('darkModeSwitch');
    const body = document.body;

    darkModeSwitch.addEventListener('change', () => {
        if (darkModeSwitch.checked) {
            body.classList.add('dark-mode');
            localStorage.setItem('darkMode', 'enabled');
        } else {
            body.classList.remove('dark-mode');
            localStorage.setItem('darkMode', 'disabled');
        }
    });

    if (localStorage.getItem('darkMode') === 'enabled') {
        darkModeSwitch.checked = true;
        body.classList.add('dark-mode');
    } else {
        darkModeSwitch.checked = false;
        body.classList.remove('dark-mode');
    }
});
