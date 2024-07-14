document.addEventListener('DOMContentLoaded', () => {
    const darkModeSwitch = document.getElementById('darkModeSwitch');
    const body = document.body;

    const enableDarkMode = () => {
        body.classList.add('dark-mode');
        localStorage.setItem('darkMode', 'enabled');
    };

    const disableDarkMode = () => {
        body.classList.remove('dark-mode');
        localStorage.setItem('darkMode', 'disabled');
    };

    darkModeSwitch.addEventListener('change', () => {
        if (darkModeSwitch.checked) {
            enableDarkMode();
        } else {
            disableDarkMode();
        }
    });

    if (localStorage.getItem('darkMode') === 'enabled') {
        darkModeSwitch.checked = true;
        enableDarkMode();
    } else {
        darkModeSwitch.checked = false;
        disableDarkMode();
    }
});
